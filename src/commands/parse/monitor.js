import ParseBase from "~/src/commands/parse/base";
import DATE_FORMAT from '~/src/constants/date_format';
import _ from 'lodash';
import moment from "moment";
import MMonitor from '~/src/model/parse/monitor';
import MCommon from '~/src/model/parse/common';
import Util from '~/src/lib/utils/modules/util';

const COUNT_BY_MINUTE_DATE_FORMAT = DATE_FORMAT.DATABASE_BY_MINUTE; //YYYY-MM-DD_HH:mm;
const MonitorTableName = 't_o_monitor';
const MonitorExtTableName = 't_o_monitor_ext';


class ParseMonitor extends ParseBase {
    static get signature() {
        return `
      Parse:Monitor
      {startAtYmdHi:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
      {endAtYmdHi:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
    `
    }
    static get description() {
        return '[按分钟] 解析kafka日志, 分析Monitor';
    }
    /**
     * 判断该条记录是不是monitor记录 action:error
     * @param {Object} record
     * @return {Boolean}
     */
    isLegalRecord(record) {
        let md5 = _.get(record, ['md5'], '');
        let action = _.get(record, ['query', 'action'], '');
        if (_.isEmpty(md5)) {
            return false;
        }
        if (action !== 'error') {
            return false;
        }
        return true;
    }
    // 更新记录
    async processRecordAndCacheInProjectMap(record) {
        let projectId = _.get(record, ['project', 'id'], 0);
        let visitAt = _.get(record, ['time'], '0');
        // TODO: 由于目前埋点的时候没有写清楚errorType和errorName，所以这边默认
        let errorType = MMonitor.ERROR_TYPE_JS_ERROR;
        let errorName = MMonitor.ERROR_TYPE_MAP[errorType];
        // TODO: httpCode 目前给200固定；
        let httpCode = 200;
        // TODO: 暂时没有duringMs/requestSizeB/responseSizeB
        let duringMs = _.get(record, ['detail', 'during_ms'], 0);
        let requestSizeB = _.get(record, ['detail', 'request_size_b'], 0);
        let responseSizeB = _.get(record, ['detail', 'response_size_b'], 0);
        let url = _.get(record, ['query', 'burl'], '');
        let country = _.get(record, ['location', 'country'], '');
        let province = _.get(record, ['location', 'province'], '');
        let city = _.get(record, ['location', 'city'], '');
        let md5 = _.get(record, ['md5'], '');
        // TODO 其实应该存一下ua信息和错误stack信息；
        let extraData = _.get(record, ['ua']);

        url = url + '';
        if (url.length > 200) {
            url = url.slice(0, 200);
        }

        // 对error_name长度做限制
        errorName = errorName + '';
        if (errorName.length > 254) {
            errorName = errorName.slice(0, 254);
        }

        // 处理参数
        httpCode = parseInt(httpCode);
        if (_.isFinite(httpCode) === false) {
            httpCode = 0;
        }

        duringMs = parseInt(duringMs);
        if (_.isFinite(duringMs) === false) {
            duringMs = 0;
        }
        requestSizeB = parseInt(requestSizeB);
        if (_.isFinite(requestSizeB) === false) {
            requestSizeB = 0;
        }

        responseSizeB = parseInt(responseSizeB);
        if (_.isFinite(responseSizeB) === false) {
            responseSizeB = 0;
        }

        
        // FIX: 这里不应该是转成字符串，因为后续存入数据库就是用的时间戳。
        // let visitAtTime = moment(visitAt).format(COUNT_BY_MINUTE_DATE_FORMAT)
        let visitAtTime = moment(visitAt).unix();
        console.log(visitAt, visitAtTime)

        let monitorRecord = {
            visitAt: visitAtTime,
            errorType,
            errorName,
            httpCode,
            duringMs,
            requestSizeB,
            responseSizeB,
            url,
            country,
            province,
            city,
            md5,
            extraData
        };

        let visitAtMap = new Map();
        let monitorRecordList = [];
        if (this.projectMap.has(projectId)) {
            visitAtMap = this.projectMap.get(projectId);
            if (visitAtMap.has(visitAtTime)) {
                monitorRecordList = visitAtMap.get(visitAtTime);
            }
        }
        monitorRecordList.push(monitorRecord);
        visitAtMap.set(visitAtTime, monitorRecordList);
        this.projectMap.set(projectId, visitAtMap);
        return true;
    }

    async save2DB() {
        // 这么麻烦就为了获取一个总记录条数，为什么不在存的时候就记录下来呢~？
        let totalRecordCount = this.getRecordCountInProjectMap();
        let processRecordCount = 0;
        let successSaveCount = 0;
        for (let [projectId, visitAtMap] of this.projectMap) {
            for (let [visitAtTime, monitorMap] of visitAtMap) {
                let visitAt = moment(visitAtTime, DATE_FORMAT.DATABASE_BY_MINUTE).unix();
                let tenMinutesAgoAt = visitAt - 10 * 60;
                let oneMinuteLaterAt = visitAt + 60;
                let processTableName = MMonitor.getTableName(projectId, visitAt);
                // 以防在10分钟内这条数据被重复记录了
                let rawMonitorList = await MMonitor.getRecordListInRange(projectId, tenMinutesAgoAt, oneMinuteLaterAt);
                let uniqueSet = new Set();
                for (let rawRecord of rawMonitorList) {
                    const { log_at: logAt, md5 } = rawRecord;
                    const uniqueKey = logAt + '' + md5;
                    uniqueSet.add(uniqueKey);
                }
                for (let monitorRecord of monitorMap) {
                    let {
                        visitAt,
                        extraData,
                        md5
                    } = monitorRecord;
               
                    const sqlParams = {
                        error_type: monitorRecord.errorType,
                        error_name: monitorRecord.errorName,
                        http_code: monitorRecord.httpCode,
                        during_ms: monitorRecord.duringMs,
                        request_size_b: monitorRecord.requestSizeB,
                        response_size_b: monitorRecord.responseSizeB,
                        url: monitorRecord.url,
                        country: monitorRecord.country,
                        province: monitorRecord.province,
                        city: monitorRecord.city,
                        md5: monitorRecord.md5,
                        log_at: visitAt
                    }
                    // 对接收到的参数做进一步的校验，因为数据库里面的类型与传过来的类型可能不一致。
                    // 比如http_code在一些情况下传来的是空字符串，数据库中存放的是int型。
                    const sqlRecord = Util.handleEmptyData(sqlParams);

                    //monitor查询参数
                    let monitorParams = {
                        projectId: projectId,
                        tableName: MonitorTableName,
                        splitBy: MCommon.SPLIT_BY.MONTH,
                        select: 'monitor_ext_id',
                        where: {
                            log_at: visitAt,
                            md5: monitorRecord.md5
                        },
                        operatorAt: visitAt
                    }
                    // monitor_ext查询更新参数
                    let monitorExtParams = {
                        projectId: projectId,
                        tableName: MonitorExtTableName,
                        datas: {
                            ext_json: JSON.stringify(extraData)
                        },
                        splitBy: MCommon.SPLIT_BY.MONTH,
                        operatorAt: visitAt
                    }
                    const key = visitAt + '' + md5;
                    // 没有存储过， 那就操作存储
                    if (uniqueSet.has(key) === false) {
                        // MCommon的insertInto是一个通用方法，向某个数据库插入数据
                        let monitorRes = await MCommon.insertInto(monitorExtParams);
                        // 先存ext信息，获取它的id，然后关联到真正的monitor数据中
                        sqlRecord.monitor_ext_id = monitorRes[0];
                        monitorParams.datas = sqlRecord;
                        let isSuccess = await MCommon.replaceInto(monitorParams);
                        if (isSuccess) {
                            successSaveCount = successSaveCount + 1;
                        }
                    }
                    processRecordCount = processRecordCount + 1;
                    this.reportProcess(processRecordCount, successSaveCount, totalRecordCount, processTableName);
                }
            }
        }
        return { totalRecordCount, processRecordCount, successSaveCount }
    }

    getRecordCountInProjectMap() {
        let totalCount = 0;
        for (let [projectId, visitAtMap] of this.projectMap) {
            for (let [visitAtTime, monitorMap] of visitAtMap) {
                for (let monitorRecord of monitorMap) {
                    totalCount = totalCount + 1;
                }
            }
        }
        return totalCount;
    }

}

export default ParseMonitor;
