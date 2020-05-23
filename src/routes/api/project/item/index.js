import _ from 'lodash';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import API_RES from '~/src/constants/api_res';
import MUser from '~/src/model/project/user';
import MProject from "~/src/model/project/project";
import Util from '~/src/lib/utils/util';

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
        'cDesc',
        'isDelete'
    ]) {
        if (_.has(body, itemKey)) {
            // FIX: 表中字段和api中的字段不一样。
            // 应该把驼峰转一下下划线。
            let itemKey2 = Util.camel2under(itemKey);
            updateRecord[itemKey2] = _.get(body, [itemKey], '')
        }
    }
    // 检查权限
    if (_.has(updateRecord, ['projectName']) || _.has(updateRecord, ['projectName'])) {
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

export default {
    ...add,
    ...update
}