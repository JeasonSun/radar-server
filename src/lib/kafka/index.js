import moment from 'moment';
import path from 'path';
import appConfig from '~/src/configs/app';

const LOG_TYPE_RAW = 'raw';
const LOG_TYPE_JSON = 'json';
const LOG_TYPE_TEST = 'test';

const YMFormat = 'YYYYMM'
const DDFormat = 'DD'
const HHFormat = 'HH'
const mmFormat = 'mm'

let logPath = appConfig.absoluteLogPath;

function getAbsoluteLogUriByType(logAt, logType = LOG_TYPE_RAW) {
    // 确保logType一定是指定类型
    switch (logType) {
        case LOG_TYPE_RAW:
            break;
        case LOG_TYPE_JSON:
            break;
        case LOG_TYPE_TEST:
            break;
        default:
            logType = LOG_TYPE_RAW;
    }
    let startAtMoment = moment.unix(logAt);
    let basePath = getAbsoluteBasePathByType(logType);
    let monthDirName = getMonthDirName(logAt);
    let fileName = `./${monthDirName}/day_${startAtMoment.format(DDFormat)}/${startAtMoment.format(HHFormat)}/${startAtMoment.format(mmFormat)}.log`;
    let fileUri = path.resolve(basePath, fileName);
    return fileUri;
}

/**
 * 获得日志所在文件夹
 */
function getAbsoluteBasePathByType(logType) {
    // 确保logType一定是指定类型
    switch (logType) {
        case LOG_TYPE_RAW:
            break
        case LOG_TYPE_JSON:
            break
        case LOG_TYPE_TEST:
            break
        default:
            logType = LOG_TYPE_RAW
    }
    let fileUri = path.resolve(logPath, 'kafka', logType);
    return fileUri;
}

/**
 * 工具函数, 获取时间戳对应的月份名, 方便删除无用日志
 * @param {string} logAt
 * @return {string}
 */
function getMonthDirName(logAt) {
    let startAtMoment = moment.unix(logAt)
    let monthDirName = `month_${startAtMoment.format(YMFormat)}`
    return monthDirName;
}



export default {
    // 工具函数
    getAbsoluteLogUriByType,
    getAbsoluteBasePathByType,
    getMonthDirName,
    // 常量
    LOG_TYPE_RAW,
    LOG_TYPE_JSON,
    LOG_TYPE_TEST
}

