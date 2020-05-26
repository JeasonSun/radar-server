import _ from 'lodash';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import API_RES from '~/src/constants/api_res';
import CODE from '~/src/constants/code';
import MProjectMember from '~/src/model/project/project_member';
import MUser from '~/src/model/project/user';
import moment from 'moment';
import Logger from '~/src/lib/logger';

/** 
 * 添加项目成员
 * @param {*} id 项目id，在路由里
 * @param {*} ucid 在body里，
 * @param {*} role 在body里，
 * @param {*} need_alarm 在body里，
 * 
*/
const add = RouterConfigBuilder.routerConfigBuilder('/api/project/member/add', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    let body = _.get(req, ['body'], {});
    let addType = _.get(body, ['type'], 0); // 默认： 0 ucid, 1:account;
    let ucidList = _.get(body, ['ucid_list']);
    let accountList = _.get(body, ['account_list']);
    if(addType == 1){ // 按照account来查询；
        if (_.isEmpty(accountList)) {
            return res.send(API_RES.showError('type=1时，缺少参数account_list', CODE.PARAM_MISS));
        } else {
            accountList = accountList.split(',');
        }
    } else {
        if (_.isEmpty(ucidList)) {
            return res.send(API_RES.showError('缺少参数ucid_list', CODE.PARAM_MISS));
        } else {
            ucidList = ucidList.split(',');
        }
    }

    let role = _.get(body, ['role'], MProjectMember.ROLE_DEV);
    let needAlarm = parseInt(_.get(body, ['need_alarm'], 0));
    let createUcid = _.get(req, ['radar', 'user', 'ucid'], '0');
    let projectId = _.get(req, ['radar', 'project', 'projectId'], 0);
    let updateUcid = createUcid;
    if (_.isInteger(needAlarm) === false) {
        return res.send(API_RES.showError('needAlarm参数错误', CODE.PARAM_ERROR));
    }
    // 检查权限
    let isAdmin = await MUser.isAdmin(createUcid);
    let isOwner = await MProjectMember.isProjectOwner(projectId, createUcid);
    if (isAdmin === false && isOwner === false) {
        return res.send(API_RES.noPrivilege('只有组长和管理员才可以调整成员'));
    }

    // if (_.isEmpty(ucidList)) {
    //     return res.send(API_RES.showResult([], '添加完毕'));
    // }

    let anyOneSuccess = false;
    let successArray = [];
    let errorArray = [];
    let accounts = [];
    if(addType == 1){
        accounts = accountList;
    } else {
        accounts = ucidList;
    }
    for (let account of accounts) {    
        // 检查user里是否有ucid对应的记录
        let rawUser = null;
        if (addType == 1){
            rawUser = await MUser.getByAccount(account);
        } else {
            rawUser = await MUser.get(account);
        }

        if (_.isEmpty(rawUser) || rawUser.is_delete === 1) {
            // TODO: 用户不存在，应该直接创建用户，并且添加。先略过，保证用户只能先创建，再申请添加。
            // fee中会在UC中创建用户。暂时不考虑UC
            errorArray.push(account);
            continue;
        }
        let ucid = rawUser.ucid;
        // 检查数据库中，该项目是否存在此ucid，一个人在数据库中不能添加两次。
        let record = await MProjectMember.getByProjectIdAndUcid(projectId, ucid);

        // 不在数据库中，直接添加到列表中
        if (_.isEmpty(record)) {
            let insertData = {
                ucid,
                project_id: projectId,
                role,
                need_alarm: needAlarm,
                create_ucid: createUcid,
                update_ucid: createUcid
            }
            let isSuccess = await MProjectMember.add(insertData);
            if (isSuccess) {
                successArray.push(account);
            } else {
                errorArray.push(account);
            }
            anyOneSuccess = anyOneSuccess || isSuccess;
            continue;
        }

        // 已经在数据库中了，
        const { id, is_delete: isDelete } = record;
        if (isDelete === 0) {
            //已经有数据了，而且没有删除
            errorArray.push(account);
            continue;
        }
        // 已经有数据了， 但是被删除了，那就还原。
        let updateData = {
            is_delete: 0,
            update_ucid: updateUcid,
            role,
            need_alarm: needAlarm
        }
        let isSuccess = await MProjectMember.update(id, updateData);
        if (isSuccess) {
            successArray.push(account);
        } else {
            errorArray.push(account);
        }
        anyOneSuccess = anyOneSuccess || isSuccess;
    }

    if (anyOneSuccess) {
        res.send(API_RES.showResult(successArray, '添加完毕'));
    } else {
        res.send(API_RES.showError(`添加失败,${errorArray}`))
    }
})

// 获取当前项目的所有成员 project_id(在路由里)
// const list = 

// 更改项目成员的信息，主要指权限
let update = RouterConfigBuilder.routerConfigBuilder('/api/project/member/update', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    let body = _.get(req, ['body'], {});
    let id = parseInt(_.get(body, ['id'], 0)); //FIX: 
    let updateUcid = _.get(req, ['radar', 'user', 'ucid'], '0');
    let projectId = _.get(req, ['radar', 'project', 'projectId'], 1);
    let updateData = {
        update_ucid: updateUcid
    }
    for (let key of [
        'role',
        'need_alarm'
    ]) {
        if (_.has(body, [key])) {
            updateData[key] = _.get(body, [key], '');
        }
    }
    if (_.has(updateData, ['role'])) {
        // 修改角色前先检查权限
        let isAdmin = await MUser.isAdmin(updateUcid);
        let isOwner = await MProjectMember.isProjectOwner(projectId, updateUcid);
        if (isAdmin === false && isOwner === false) {
            return res.send(API_RES.noPrivilege('只有组长和管理员才可以调整成员'));
        }
    }
    let isSuccess = await MProjectMember.update(id, updateData);

    if (isSuccess) {
        res.send(API_RES.showResult([], '更新成功'));
    } else {
        res.send(API_RES.showError('更新失败'));
    }
});

export default {
    ...add,
    ...update
}