/** 
 * 用户信息处理
 * /api/user/register  注册用户
 * /api/user/detail 获取用户信息
*/

import _ from 'lodash';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import MUser from '~/src/model/project/user';
import API_RES from '~/src/constants/api_res';
import CODE from '~/src/constants/code';


const register = RouterConfigBuilder.routerConfigBuilder('/api/user/register', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    const { body = {} } = req;
    const { account = '', password = '', nickname = '' } = body;
    const email = ''; // FIX: 不需要让email默认就是account
    const registerType = MUser.REGISTER_TYPE_SITE;
    const role = MUser.ROLE_DEV;
    const passwordMd5 = MUser.hash(password);
    const userInfo = {
        email,
        password_md5: passwordMd5,
        nickname,
        register_type: registerType,
        role
    }
    // 判断此账号是否存在
    // FIX: 官方这里缺少await；
    let rawUser = await MUser.getByAccount(account);
    if (_.isEmpty(rawUser) || rawUser.is_delete === 1) {
        const isSuccess = await MUser.register(account, userInfo);
        if (isSuccess) {
            res.send(API_RES.showResult([], '注册成功'))
        } else {
            res.send(API_RES.showError('注册失败', CODE.REGISTER_ERROR))
        }
    } else {
        res.send(API_RES.showError('账号已存在', CODE.ACCOUNT_EXIST))
    }
}, false, false);

const detail = RouterConfigBuilder.routerConfigBuilder('/api/user/detail', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
    let request = req.query;
    let cookieAccount = _.get(req, ['radar', 'user', 'account'], '');
    // 没有指定account，则返回当前登录用户信息。
    let reqAccount = _.get(request, ['account'], cookieAccount);
    let rawUser = await MUser.getByAccount(reqAccount);
    let user = MUser.formatRecord(rawUser);
    res.send(API_RES.showResult(user));
}, false);


export default {
    ...register,
    ...detail
}

