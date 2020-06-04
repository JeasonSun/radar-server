import moment from 'moment';
import _ from 'lodash';
import Knex from '~/src/lib/mysql';

const SPLIT_BY = {
    PROJECT: 'project',
    MONTH: 'month'
}

function getTableName(tableName, splitBy, projectId, operateAt) {
    let yearMonth = moment().format('YYYYMM');
    if (operateAt) { // 开发的时候，测试的数据是2019年的数据，所以，如果直接用当前时间，tableName不正确
        yearMonth = moment.unix(operateAt).format('YYYYMM');
    }

    if (splitBy === 'project') {
        return `${tableName}_${projectId}`;
    } else if (splitBy === 'month') {
        return `${tableName}_${projectId}_${yearMonth}`;
    }
    return tableName;
}

async function insertInto(infos) {
    const { projectId, tableName, splitBy, datas, operatorAt } = infos;
    let updateAt = moment().unix();
    if (!datas['create_time']) {
        datas['create_time'] = updateAt;
    }
    if (!datas['update_time']) {
        datas['update_time'] = updateAt;
    }
    const TableName = getTableName(tableName, splitBy, projectId, operatorAt);
    return Knex(TableName)
        .insert(datas)
        .catch(() => { return 0 });
}
/** 
 * 封装Knex,按照指定条件查询， 有数据更新，无数据添加
*/
async function replaceInto(params) {
    const { tableName, where, datas, splitBy, projectId, operatorAt } = params;
    const table = getTableName(tableName, splitBy, projectId, operatorAt);
    let res = await Knex.from(table).select('id').where(where);
    let id = _.get(res, [0, 'id'], 0);
    let updateAt = moment().unix();
    let isSuccess = false;
    if (id > 0) {
        datas['update_time'] = updateAt;
        const affectRows = await Knex(table)
            .where(`id`, '=', id)
            .update(datas)
            .catch((error) => {
                console.log(error);
                return 0;
            })
        isSuccess = affectRows > 0;
    } else {
        datas['create_time'] = updateAt;
        datas['update_time'] = updateAt;
        const insertId = await Knex
            .insert(datas)
            .into(table)
            .catch((error) => {
                console.log(error);
                return 0;
            });
        isSuccess = insertId > 0;
    }
    return isSuccess;
}


export default {
    SPLIT_BY,
    insertInto,
    replaceInto
}