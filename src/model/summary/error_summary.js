import Knex from '~/src/library/mysql';
import moment from 'moment';
import _ from 'lodash';
import Logger from '~/src/lib/logger';
// import redis from '~/src/lib/redis';
// import MCityDistribution from '~/src/model/parse/city_distribution'
import DATE_FORMAT from '~/src/constants/date_format';
// import DatabaseUtil from '~/src/lib/utils/modules/database';

const TABLE_COLUMN = [
    `id`,
    `error_type`,
    `error_name`,
    `url_path`,
    `city_distribution_id`,
    `count_at_time`,
    `count_type`,
    `error_count`,
    `create_time`,
    `update_time`
]

const BASE_TABLE_NAME = 't_r_error_summary';
const MAX_LIMIT = 100;
const BASE_REDIS_KEY = 'error_summary';
const REDIS_KEY_ERROR_NAME_DISTRIBUTION_CACHE = BASE_REDIS_KEY + '_' + 'error_name_distribution_cache';

/**
 * 获取表名
 * @param {number} projectId 项目id
 * @param {number} createTimeAt 创建时间, 时间戳
 * @return {String}
 */
function getTableName(projectId, createTimeAt) {
    const DATE_FORMAT = 'YYYYMM';
    let YmDate = moment.unix(createTimeAt).format(DATE_FORMAT);
    return BASE_TABLE_NAME + '_' + projectId + '_' + YmDate;
}

async function insertErrorSummaryRecord(projectId, countAt, countType, errorType, errorName, urlPath, cityDistributionId, errorCount){
    
}


export default {
    getTableName,
    insertErrorSummaryRecord,
}