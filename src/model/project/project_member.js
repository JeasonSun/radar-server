import _ from 'lodash';
import moment from 'moment';
import Knex from '~/src/lib/mysql';
import Logger from '~/src/lib/logger';
import MUser from '~/src/model/project/user';
import ProjectConfig from '~/src/configs/project';

const ROLE_DEV = 'dev';
const ROLE_OWNER = 'owner';


const BASE_TABLE_NAME = 't_o_project_member'
const TABLE_COLUMN = [
    `id`,
    `project_id`,
    `ucid`,
    `role`,
    `need_alarm`,
    `is_delete`,
    `create_time`,
    `create_ucid`,
    `update_time`,
    `update_ucid`
]
const DISPLAY_TABLE_COLUMN = [
    `id`,
    `project_id`,
    `ucid`,
    `role`,
    `need_alarm`,
    `create_time`,
    `create_ucid`,
    `update_time`,
    `update_ucid`
]

function getTableName() {
    return BASE_TABLE_NAME
}
/**
 * 删除不必要的字段
 * @param {*} rawRecord
 */
function formatRecord(rawRecord) {
    let record = {};
    for (let column of DISPLAY_TABLE_COLUMN) {
        if (_.has(rawRecord, [column])) {
            record[column] = rawRecord[column]
        }
    }
    return record;
}
/**
 * @description 添加一条project_member记录
 * @param {*} data
 * @returns 
 */
async function add(data) {
    const tableName = getTableName();
    const createTime = moment().unix();
    const updateTime = createTime;
    let insertData = {};
    for (let column of [
        `project_id`,
        `ucid`,
        `role`,
        `need_alarm`, // FIX: fee拼写错误
        `create_ucid`,
        `update_ucid`
    ]) {
        if (_.has(data, [column])) {
            insertData[column] = data[column];
        }
    }
    insertData = {
        ...insertData,
        create_time: createTime,
        update_time: updateTime,
        is_delete: 0
    }

    let insertResult = await Knex
        // .returning('id') // FIX: knex mysql似乎不支持returning,会warning。
        .insert(insertData)
        .into(tableName)
        .catch(err => {
            Logger.log(err.message, 'project_member add 出错');
            return []
        });
    let id = _.get(insertResult, [0], 0);
    return id > 0;
}

/**
 * @description 获取某一个成员所有的项目列表
 * @param {*} ucid
 */
async function getProjectMemberListByUcid(ucid, offset = 0, max = 50) {
    const tableName = getTableName();
    let rawRecordList = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('ucid', ucid)
        .andWhere('is_delete', 0)
        .offset(offset)
        .limit(max)
        .catch(err => {
            Logger.log(err.message, 'project_member    getProjectIdList   出错')
            return []
        });
        
    // 伪造一个数据， 如果该用户的项目中不包含测试项目，那么就添加一个测试项目。
    let templateRecord = {
        id: 0,
        ucid,
        role: ROLE_DEV,
        need_alarm: 0,
        is_delete: 0,
        create_time: 0,
        create_ucid: 0,
        update_time: 0,
        update_ucid: 0
    }
    let projectMemberMap = {};
    for (let rawRecord of rawRecordList) {
        const { project_id: projectId } = rawRecord
        projectMemberMap[projectId] = 1;
    }
    for (let openProjectId of ProjectConfig.OPEN_PROJECT_ID_LIST) {
        if (_.has(projectMemberMap, [openProjectId]) === false) {
            let template = {
                ...templateRecord,
                project_id: openProjectId
            };
            rawRecordList.push(template);
        }
    }
    return rawRecordList;
}
/**
 * 检查用户是不是项目owner
 * @param {*} projectId
 * @param {*} ucid
 */
async function isProjectOwner(projectId, ucid){
    let record = await getByProjectIdAndUcid(projectId, ucid);
    if(_.isEmpty(record)){
        return false
    }
    let isExist = _.get(record, ['is_delete'], 1) === 0;
    let isOwner = _.get(record, ['role'], ROLE_DEV) === ROLE_OWNER;
    if(isExist && isOwner){
        return true;
    } else {
        return false;
    }
}
/**
 * 根据 项目id & uicd 获取成员记录
 * @param {number} projectId
 * @param {number} ucid
 */
async function getByProjectIdAndUcid(projectId, ucid){
    let tableName = getTableName();
    let rawRecord = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('project_id', projectId)
        .andWhere('ucid', ucid)
        .catch(err => {
            Logger.log(err.message, 'project_member    getList   出错')
            return []
        });
    let record = _.get(rawRecord, [0], {});
    return record;
}

/**
 * 更新记录
 * @param {number} id
 * @param {object} updateData = {}
 */
async function update (id, updateData){
    const nowAt = moment().unix();
    let newRecord = {};
    for (let column of [
        'project_id',
        'ucid',
        'role',
        'need_alarm',
        'is_delete',
        'update_ucid'
    ]) {
        if (_.has(updateData, [column])) {
            newRecord[column] = updateData[column]
        }
    }
    newRecord = {
        ...newRecord,
        update_time: nowAt
    }
    const tableName = getTableName();
    const result = await Knex(tableName)
        .update(newRecord)
        .where('id', id)
        .catch(err => {
            Logger.log(err.message, 'project_member    update   出错')
            return []
        });
    return result === 1;
}

/**
 * 检查用户是否有项目权限
 * @param {*} projectId
 * @param {*} ucid
 */
async function hasPrivilege(projectId, ucid) {
    // 检查是否是项目1，如果是，则通过（默认项目1是展示项目，都会有权限）;
    if (_.indexOf(ProjectConfig.OPEN_PROJECT_ID_LIST, projectId) >= 0) {
        return true;
    }
    // 检查是否是admin,如果是，直接通过检查
    const isAdmin = await MUser.isAdmin(ucid);
    if (isAdmin) {
        return true;
    }
    // 不是admin
    let record = await getByProjectIdAndUcid(projectId, ucid);
    if (_.isEmpty(record)) {
        return false;
    }
    let isExist = _.get(record, ['is_delete'], 1) === 0;
    return isExist;
}

/**
 * 根据项目id获取这个项目下所有用户列表
 * @param {*} projectId
 */
async function getProjectMemberList(projectId) {
    const tableName = getTableName()
    const result = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('project_id', projectId)
        .andWhere('is_delete', 0)
        .catch(err => {
            Logger.log(err.message, 'project_member    getMemberIdList   出错')
            return []
        })
    return result;
}
/**
 * 获取某个项目的成员信息
 * @param {*} projectId
 * @returns 
 */
async function getProjectMemberInfo(projectId){
    const tableName = getTableName()
    const result = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('project_id', projectId)
        .andWhere('is_delete', 0)
        .catch(err => {
            Logger.log(err.message, 'project_member    getMemberIdList   出错')
            return []
        })
    const count = result.length;
    let owners = [];
    let members = [];
    result.forEach((member) => {
        if (member.role == ROLE_OWNER){
            owners.push(formatRecord(member));
        }
        members.push(formatRecord(member));
    });
    return {
        count,
        members,
        owners
    }
}

export default {
    ROLE_DEV,
    ROLE_OWNER,
    // 限制导出数据
    formatRecord,

    add,
    update,

    getProjectMemberListByUcid,
    getProjectMemberList,
    getProjectMemberInfo,

    isProjectOwner,
    getByProjectIdAndUcid,
    hasPrivilege

}
