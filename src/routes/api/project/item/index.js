import _ from 'lodash';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import API_RES from '~/src/constants/api_res';
import CODE from '~/src/constants/code';
import MUser from '~/src/model/project/user';
import MProject from "~/src/model/project/project";
import Util from '~/src/lib/utils/util';
import MProjectMember from '~/src/model/project/project_member';

const add = RouterConfigBuilder.routerConfigBuilder('/api/project/item/add', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    let body = _.get(req, ['body'], {});
    let displayName = _.get(body, ['displayName'], '');
    let projectName = _.get(body, ['projectName'], '');
    let cDesc = _.get(body, ['cDesc']);
    let createUcid = _.get(req, ['radar', 'user', 'ucid'], '0');
    let updateUcid = createUcid;

    // 检查权限
    let isAdmin = await MUser.isAdmin(createUcid);
    if (isAdmin === false) {
        return res.send(API_RES.noPrivilege('只有管理员才可以添加项目'));
    }

    let insertData = {
        project_name: projectName, // 项目代号（替代项目id,方便debug）
        display_name: displayName, // 项目名称
        c_desc: cDesc, // 备注信息
        create_ucid: createUcid,
        update_ucid: updateUcid
    }

    let isSuccess = await MProject.add(insertData);

    if (isSuccess) {
        res.send(API_RES.showResult([], '添加成功'))
    } else {
        res.send(API_RES.showError('添加失败'));
    }
}, false);

const update = RouterConfigBuilder.routerConfigBuilder('/api/project/item/update', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    let body = _.get(req, ['body'], {});
    let id = _.get(body, ['id'], 0);
    let updateUcid = _.get(req, ['radar', 'user', 'ucid'], '0');
    let updateRecord = {}
    for (let itemKey of [
        'displayName',
        'projectName',
        'cDesc'
    ]) {
        if (_.has(body, itemKey)) {
            // FIX: 表中字段和api中的字段不一样。
            // 应该把驼峰转一下下划线。
            let itemKey2 = Util.camel2under(itemKey);
            updateRecord[itemKey2] = updateRecord[itemKey] = _.get(body, [itemKey], '')
        }
    }
    // 检查权限
    if (_.has(updateRecord, ['projectName'])) {
        let isAdmin = await MUser.isAdmin(updateUcid);
        if (isAdmin === false) {
            return res.send(API_RES.noPrivilege('只有管理员才可以修改projectName字段'))
        }
    }
    // 如果没有更新字段，直接返回更新成功
    if (_.isEmpty(updateRecord)) {
        res.send(API_RES.showResult([], '更新成功'))
        return
    }
    updateRecord['update_ucid'] = updateUcid;

    let isSuccess = await MProject.update(id, updateRecord)
    if (isSuccess) {
        res.send(API_RES.showResult([], '更新成功'))
    } else {
        res.send(API_RES.showError('更新失败'))
    }
}, false);

// FIX:修改fee中的请求方式 get->post;
const deleteProject = RouterConfigBuilder.routerConfigBuilder('/api/project/item/delete', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    let body = _.get(req, ['body'], {});
    let id = _.get(body, ['id'], 0);
    let updateUcid = _.get(req, ['radar', 'user', 'ucid'], '0');

    // 检查权限
    let isAdmin = await MUser.isAdmin(updateUcid);
    if (isAdmin === false) {
        return res.send(API_RES.noPrivilege('只有管理员才能可以删除项目'));
    }
    let updateData = {
        is_delete: 1,
        update_ucid: updateUcid
    }
    let isSuccess = await MProject.update(id, updateData);
    if (isSuccess) {
        res.send(API_RES.showResult([], '删除成功'));
    } else {
        res.send(API_RES.showError('删除失败'));
    }
}, false);

const detail = RouterConfigBuilder.routerConfigBuilder('/api/project/item/detail', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
    let id = parseInt(_.get(req, ['query', 'id'], 0));

    if (_.isInteger(id) === false) {
        return res.send(API_RES.showError('参数错误', CODE.PARAM_ERROR));
    }

    let project = await MProject.get(id);
    // FIX: 这里项目可以已经删除了， is_delete:1;

    if (_.isEmpty(project)) {
        res.send(API_RES.showError(`项目id:${id}不存在`, CODE.NO_DATA));
    } else {
        if (project.is_delete == 1) {
            res.send(API_RES.showError(`项目id:${id}已删除`, CODE.NO_DATA));
        } else {
            project = MProject.formatRecord(project);
            res.send(API_RES.showResult(project))
        }
    }
}, false);

const list = RouterConfigBuilder.routerConfigBuilder('/api/project/item/list', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
    let ucid = _.get(req, ['radar', 'user', 'ucid'], '0');
    // 判断是否是管理员，如果是，返回全部项目列表
    // 管理员是所有项目的owner
    const isAdmin = await MUser.isAdmin(ucid);

    if (isAdmin) {
        let rawProjectList = await MProject.getList();
        let projectList = []
        for (let rawProject of rawProjectList) {
            let project = MProject.formatRecord(rawProject);
            project = {
                ...project,
                role: MProjectMember.ROLE_OWNER,
                need_alarm: 0
            }
            projectList.push(project)
        }
        return res.send(API_RES.showResult(projectList));
    }
    // 非管理员
    // 去project_member 里拿到ucid对应的项目成员
    // TODO: 这里offset和max并不是传进来的，应该需要传吧？
    let offset = 0;
    let max = 50;
    let rawProjectMemberList = await MProjectMember.getProjectMemberListByUcid(ucid, offset, max);
    let projectIdList = [];
    let projectMap = {};
    
    for (let rawProjectMember of rawProjectMemberList) {
        let id = rawProjectMember['project_id'];
        projectMap[id] = rawProjectMember;
        projectIdList.push(id);
    }
    // 去project拿到项目的名字；
    let rawProjectList = await MProject.getProjectListById(projectIdList);
    let projectList = [];
    for(let rawProject of rawProjectList){
        let project = MProject.formatRecord(rawProject);
        const projectId = project['id'];
        project = {
            ...project,
            role: _.get(projectMap, [projectId, 'role'], MProjectMember.ROLE_DEV),
            need_alarm: _.get(projectMap, [projectId, 'need_alarm'], 0)
        };
        projectList.push(project);
    }

    res.send(API_RES.showResult(projectList));

}, false);

export default {
    ...add,
    ...update,
    ...deleteProject,
    ...detail,
    ...list
}