import moment from 'moment';
import Knex from '~/src/lib/mysql';
import Logger from '~/src/lib/logger';

const BASE_TABLE_NAME = 't_o_monitor_ext';

const TABLE_COLUMN = [
    `id`,
    `ext_json`,
    `create_time`,
    `update_time`
]

function getTableName(projectId, visitAt) {
    let visitAtMonth = moment.unix(visitAt).format('YYYYMM');
    return `${BASE_TABLE_NAME}_${projectId}_${visitAtMonth}`;
}

async function getRecordListByIdList(projectId, createAt, idList = []) {
    let tableName = getTableName(projectId, createAt);
    let rawRecordList = Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .whereIn('id', idList)
        .catch(e => {
            Logger.warn('getRecordListByIdList查询失败 => ', e);
            return []
        })
    return rawRecordList;
}

export default {
    getTableName,
    getRecordListByIdList
}