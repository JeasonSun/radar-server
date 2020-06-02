import SaveLogBase from './base';
import fs from 'fs';
import commonConfig from '~/src/configs/common';
import moment from 'moment';
import { readLine } from 'lei-stream';
import _ from 'lodash';
import LKafka from '~/src/lib/kafka';

let jsonWriteStreamPool = new Map()
let rawLogWriteStreamPool = new Map()
class NginxParseLog extends SaveLogBase {

    constructor() {
        super();
        this.projectMap = new Map();
    }


    static get signature() {
        return `
     SaveLog:Nginx 
     {id: [Number] 读取日志的服务器ID}
     {date: [String]可以读取指定日期的日志YYYY-MM-DD}
     `
    }

    static get description() {
        return '读取nginx日志文件，并解析';
    }


    async execute(args, options) {
        console.log(args, options)
        let formatStr = args.date;
        let serverId = args.id;
        let that = this;

        // 获取项目列表
        let projectMap = await this.getProjectMap();

        let logCounter = 0;
        let legalLogCounter = 0;
        // 文件地址, 2019-10-15中15指的是一台机器地址。
        let nginxLogFilePath = commonConfig.nginxLogFilePath;
        let month = moment(formatStr).format('YYYY-MM');
        let directoryPath = `${month}-${serverId}`;
        let logAbsolutePath = `${nginxLogFilePath}/localhost_access.${directoryPath}/localhost_access_log.${formatStr}.txt`;

        if (fs.existsSync(logAbsolutePath) === false) {
            that.log(`log文件不存在，自动跳过 => ${logAbsolutePath}`);
            return;
        }
        this.log(`开始分析${logAbsolutePath}范围内的记录`);

        await new Promise((resolve, reject) => {
            let onDataIn = async (data, next) => {
                logCounter++;
                let content = data.toString();

                // 首先判断是不是测试数据，如果是测试数据，直接保存，跳过后续所有逻辑；// TODO:

                // 检查日志格式，只录入解析后，符合规则的log
                let parseResult = await that.parseLog(content, projectMap);
                if (_.isEmpty(parseResult)) {
                    // that.log('日志格式不规范, line => ', logCounter);
                    return next();
                }

                // 获取日志时间，没有原始日志时间则直接跳过 // TODO:
                let logCreateAt = this.parseLogCreateAt(content);

                // that.log('日志内容 => ', logCreateAt, parseResult);

                let projectName = _.get(parseResult, ['project', 'project_name'], 0);
                // let projectRate = _.get(parseResult, ['project', 'rate'], 100);
                // let checkFlag = _.floor(logCounter % 10000);
                // let skipIt = checkFlag > projectRate
                legalLogCounter++;
                // 存原始数据 
                let rawLogWriteStreamByLogCreateAt = this.getWriteStreamClientByType(logCreateAt, LKafka.LOG_TYPE_RAW);
                rawLogWriteStreamByLogCreateAt.write(content);
                // this.log(`收到数据, 当前共记录${legalLogCounter}/${logCounter}条数据`)

                // 存一下解析完成的JSON数据；
                let jsonWriteStreamByLogCreateAt = this.getWriteStreamClientByType(logCreateAt, LKafka.LOG_TYPE_JSON);
                jsonWriteStreamByLogCreateAt.write(JSON.stringify(parseResult));
                // 定期清一下
                // FIX: fee中这边的jsonWriteStreamPool.size永远为0，应该用base中的计算size
                if (this.getStreamPoolSize() > 100) {
                    // 每当句柄池满100后, 关闭除距离当前时间10分钟之内的所有文件流
                    this.autoCloseOldStream()
                }

                next();
            }

            let onReadFinish = () => {
                resolve();
            }

            readLine(fs.createReadStream(logAbsolutePath), {
                // 换行符，默认\n
                newline: '\n',
                // 是否自动读取下一行，默认false
                autoNext: false,
                // 编码器，可以为函数或字符串（内置编码器：json，base64），默认null
                encoding: null
            }).go(onDataIn, onReadFinish)
        });

        that.log(`${directoryPath}/${formatStr}:共收到${logCounter}条数据, 匹配处理${legalLogCounter}条数据`);
    }

    async save2DB(data) {

    }
}

export default NginxParseLog;