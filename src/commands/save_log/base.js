import Base from '~/src/commands/base';
import fs from 'fs';
import { writeLine } from 'lei-stream';
import md5 from 'md5';
import moment from 'moment';
import shell from 'shelljs';
import parser from 'ua-parser-js';
import queryString from 'query-string';
import Util from '~/src/lib/utils/modules/util';
import _ from 'lodash';
import MProject from '~/src/model/project/project';
import path from 'path';
import LKafka from '~/src/lib/kafka';


let jsonWriteStreamPool = new Map();
let rawLogWriteStreamPool = new Map();

let REG_IP = /((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}/;
let REG_TIME = /(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2}.\d*)/;


const TEST_LOG_FLAG = 'b47ca710747e96f1c523ebab8022c19e9abaa56b';

class SaveLogBase extends Base {
    isTestLog(content) {
        return content.includes(TEST_LOG_FLAG);
    }

    async getProjectMap() {
        let projectList = await MProject.getList();

        let projectMap = {};
        for (let project of projectList) {
            projectMap[project.project_name] = project
        }
        this.log('项目列表获取成功 => ', projectMap);
        return projectMap;
    }

    /** 
     * 解析日志记录所在的时间戳, 取日志时间作为时间戳, 若日志时间不规范, 则返回0
    */
    parseLogCreateAt(data) {
        let nowAt = moment().unix();
        // 由于fee中的nginx日志是实时读取的， 所以可以认为是读取的时候就是log创建的时候。暂时去除这一判断。
        // if(_.isString(data) === false){
        //     return nowAt; 
        // }
        let time = data.match(REG_TIME) && data.match(REG_TIME)[0];
        let logAtMoment = moment(time, moment.ISO_8601);
        let logAt = 0;
        if (moment.isMoment(logAtMoment) && logAtMoment.isValid()) {
            logAt = logAtMoment.unix();
        } else {
            this.log(`无法解析日志记录时间 => 自动跳过`);
        }
        return logAt;
    }

    async parseLog(data, projectMap = {}) {
        let project = null;
        for (let key in projectMap) {
            let img = projectMap[key] && projectMap[key]['log_img'] || '';
            if (!img) {
                break;
            }
            let regP = new RegExp(img);
            if (regP.test(data)) {
                project = projectMap[key];
                break;
            }
        }
        if (!project) {
            return null;
        }
        let record = {};
        record.project = project;
        record.md5 = md5(data);
        record.ip = data.match(REG_IP) && data.match(REG_IP)[0];
        record.time = data.match(REG_TIME) && data.match(REG_TIME)[0];
        let REG_URL = `"(GET ${project.log_img}(?!").*)"(.*)`;
        let info = data.match(REG_URL) && data.match(REG_URL)[1];
        let ua = data.match(REG_URL) && data.match(REG_URL)[2];
        let infoArray = info.split(' ');
        record.method = infoArray[0];
        let urlInfo = queryString.parseUrl(infoArray[1]) || {};
        record.query = urlInfo.query;
        record.url = urlInfo.url;
        record.ua = parser(decodeURIComponent(ua));
        // // 兼容处理saas系统打点UA问题, nwjs低版本下获取不到chrome的版本, 解析拿到的为chromium_ver
        let browserVersion = _.get(record.ua, ['browser', 'version'], '')
        if (browserVersion === 'chromium_ver') {
            _.set(record.ua, ['browser', 'version'], '50.0.2661.102')
            _.set(record.ua, ['browser', 'major'], '50')
        }

        // 解析IP地址，映射成城市
        record.location = await Util.ip2Locate(record.ip);
        return record;
    }


    /** 获取写入Stream */
    getWriteStreamClientByType(nowAt, logType = LKafka.LOG_TYPE_RAW) {
        // 确保logType一定是指定类型
        switch (logType) {
            case LKafka.LOG_TYPE_RAW:
                break
            case LKafka.LOG_TYPE_JSON:
                break
            case LKafka.LOG_TYPE_TEST:
                break
            default:
                logType = LKafka.LOG_TYPE_RAW
        }
        let nowAtLogUri = LKafka.getAbsoluteLogUriByType(nowAt, logType);
        // 创建对应路径
        let logPath = path.dirname(nowAtLogUri);
        shell.mkdir('-p', logPath);
        let nowAtWriteStream = null;
        if(jsonWriteStreamPool.has(nowAtLogUri)){
            nowAtWriteStream = jsonWriteStreamPool.get(nowAtLogUri);
        } else {
            nowAtWriteStream = writeLine(fs.createWriteStream(nowAtLogUri, {flag: 'a'}), {
                // 换行符，默认\n
                newline: '\n',
                encoding: null,
                cacheLines: 0 // 直接落磁盘 
            });
            jsonWriteStreamPool.set(nowAtLogUri, nowAtWriteStream);
        }
        return nowAtWriteStream;
    }

    // 自动关闭旧Stream;
    autoCloseOldStream(isCloseAll = false){
        let nowAt = moment().unix();
        let startAt = nowAt - 60 * 10; // 十分钟前
        let finishAt = nowAt + 60 * 10; // 十分钟后
        let survivalSet = new Set();
        for (let survivalAt = startAt; survivalAt < finishAt; survivalAt = survivalAt + 1) {
            let survivalAtLogUri = LKafka.getAbsoluteLogUriByType(nowAt, LKafka.LOG_TYPE_JSON)
            let survivalAtRawLogUri = LKafka.getAbsoluteLogUriByType(nowAt, LKafka.LOG_TYPE_RAW)
            if (isCloseAll === false) {
                survivalSet.add(survivalAtLogUri)
                survivalSet.add(survivalAtRawLogUri)
            }
        }
        console.log([...survivalSet]);
        let needCloseLogUriSet = new Set();
        // 获得所有过期uri key
        for (let testLogFileUri of jsonWriteStreamPool.keys()) {
            if (survivalSet.has(testLogFileUri) === false) {
                needCloseLogUriSet.add(testLogFileUri)
            }
        }
        // 依次关闭
        for (let closeLogUri of needCloseLogUriSet) {
            let needCloseStream = jsonWriteStreamPool.get(closeLogUri);
            jsonWriteStreamPool.delete(closeLogUri);
            needCloseStream.end();
        }

        // 重复一次
        needCloseLogUriSet.clear();
        for (let testLogFileUri of rawLogWriteStreamPool.keys()) {
            if (survivalSet.has(testLogFileUri) === false) {
                needCloseLogUriSet.add(testLogFileUri);
            }
        }
        for (let closeLogUri of needCloseLogUriSet) {
            let needCloseStream = rawLogWriteStreamPool.get(closeLogUri);
            rawLogWriteStreamPool.delete(closeLogUri);
            needCloseStream.end();
        }

        return true
    }

    getStreamPoolSize(){
        return jsonWriteStreamPool.size + rawLogWriteStreamPool.size;
    }



}
export default SaveLogBase;