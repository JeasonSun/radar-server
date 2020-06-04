import moment from 'moment';
import _ from "lodash";
import Logger from '~/src/lib/logger';
import Knex from '~/src/lib/mysql';
import DATE_FORMAT from '~/src/constants/date_format';
// import MMonitorExt from '~/src/model/parse/monitor_ext';

const BaseTableName = 't_o_monitor';

const ERROR_TYPE_HTTP_ERROR = '1';
const ERROR_TYPE_API_ERROR = '2';
const ERROR_TYPE_PAGE_LOAD_ERROR = '3';
const ERROR_TYPE_INIT_ERROR = '4';
const ERROR_TYPE_LOGIN_ERROR = '5';
const ERROR_TYPE_NODE_ERROR = '6';
const ERROR_TYPE_JS_ERROR = '7';
const ERROR_TYPE_CUSTOM_ERROR = '8';

const ERROR_TYPE_MAP = {};
ERROR_TYPE_MAP[ERROR_TYPE_HTTP_ERROR] = 'HTTP_ERROR';
ERROR_TYPE_MAP[ERROR_TYPE_API_ERROR] = '接口结构异常';
ERROR_TYPE_MAP[ERROR_TYPE_PAGE_LOAD_ERROR] = '页面加载异常';
ERROR_TYPE_MAP[ERROR_TYPE_INIT_ERROR] = '启动异常';
ERROR_TYPE_MAP[ERROR_TYPE_LOGIN_ERROR] = '登录异常';
ERROR_TYPE_MAP[ERROR_TYPE_NODE_ERROR] = 'NODE报错';
ERROR_TYPE_MAP[ERROR_TYPE_JS_ERROR] = 'JS异常';
ERROR_TYPE_MAP[ERROR_TYPE_CUSTOM_ERROR] = '自定义异常';

const QUERY_GROUP_BY_HOUR = 'hour';
const QUERY_GROUP_BY_MINUTE = 'minute';

const MAX_SEARCH_ERROR_NAME = 500;
const MAX_DISPLAY_ERROR = 10;
const MAX_ERROR_LOG_LENGTH = 10000;

const TABLE_COLUMN = [
    'id',
    'error_type',
    'error_name',
    'http_code',
    'monitor_ext_id',
    'during_ms',
    'request_size_b',
    'response_size_b',
    'url',
    'country',
    'province',
    'city',
    'log_at',
    'md5',
    'create_time',
    'update_time'
]

function getTableName(projectId, visitAt) {
    let visitAtMonth = moment.unix(visitAt).format('YYYYMM');
    return `${BaseTableName}_${projectId}_${visitAtMonth}`;
}
// 查询一定时间范围内的记录
async function getRecordListInRange(projectId, startAt, endAt) {
    const tableName = getTableName(projectId, endAt);
    const rawRecordList = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('log_at', '>', startAt)
        .andWhere('log_at', '<', endAt)
        .catch(err => {
            Logger.warn(err.message);
            return [];
        })
    return rawRecordList;
}


export default {
    getTableName,
    getRecordListInRange,
    ERROR_TYPE_HTTP_ERROR,
    ERROR_TYPE_API_ERROR,
    ERROR_TYPE_PAGE_LOAD_ERROR,
    ERROR_TYPE_INIT_ERROR,
    ERROR_TYPE_LOGIN_ERROR,
    ERROR_TYPE_NODE_ERROR,
    ERROR_TYPE_JS_ERROR,
    ERROR_TYPE_CUSTOM_ERROR,
    ERROR_TYPE_MAP
}
