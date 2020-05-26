import _ from 'lodash';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import API_RES from '~/src/constants/api_res';
import CODE from '~/src/constants/code';
import Auth from '~/src/lib/auth';
import MUser from '~/src/model/project/user';
import commonConfig from '~/src/configs/common';

const LOGIN_TYPE = _.get(commonConfig, ['loginType'], 'normal');
const LOGIN_MAX_AGE = 100 * 86400 * 1000; // 100day

const login = RouterConfigBuilder.routerConfigBuilder('/api/login', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    switch (LOGIN_TYPE) {
        case 'uc':
            await handleUCLogin(req, res);
            break;
        case 'normal':
            await handleNormalLogin(req, res);
            break;
        default:
            res.send(API_RES.showError('请确认登录方式'));
            break;
    }

}, false, false);

const normalLogin = RouterConfigBuilder.routerConfigBuilder('/api/login/normal', RouterConfigBuilder.METHOD_TYPE_POST, async(req, res) => {
    await handleNormalLogin(req, res)
},false, false);

const ucLogin = RouterConfigBuilder.routerConfigBuilder('/api/login/uc', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
    await handleUCLogin(req, res)
}, false, false);

const logout = RouterConfigBuilder.routerConfigBuilder('/api/logout', RouterConfigBuilder.METHOD_TYPE_GET, async(req,res) => {
    res.clearCookie('radar_token');
    res.clearCookie('ucid');
    res.clearCookie('nickname');
    res.clearCookie('account');
    res.send(API_RES.showResult({}))
},false, false);

const getLoginType = RouterConfigBuilder.routerConfigBuilder('/api/login/type', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
    res.send(API_RES.showResult(LOGIN_TYPE))
}, false, false)

const handleUCLogin = async (req, res) => {
    res.send('TODO:暂时没有支持')
}

const handleNormalLogin = async (req, res) => {
    const body = _.get(req, ['body'], {});
    const account = _.get(body, ['account'], '');
    const password = _.get(body, ['password'], '');

    const rawUser = await MUser.getSiteUserByAccount(account);
    if (_.isEmpty(rawUser) || rawUser.is_delete === 1) {
        res.send(API_RES.showError('用户不存在或已注销', CODE.ACCOUNT_NOT_EXIST));
        return;
    }
    const savePassword = _.get(rawUser, ['password_md5'], '');
    const passwordMd5 = MUser.hash(password);
    if(savePassword === passwordMd5){
        let nickname = _.get(rawUser, ['nickname'], '');
        let ucid = _.get(rawUser, ['ucid'], '');
        let avatarUrl = _.get(rawUser, ['avatar_url'], MUser.DEFAULT_AVATAR_URL);
        let registerType = _.get(rawUser, ['register_type'], MUser.REGISTER_TYPE_SITE);
        let token = Auth.generateToken(ucid, account, nickname);

        res.cookie('radar_token', token, { maxAge: LOGIN_MAX_AGE, httpOnly: false });
        res.cookie('ucid', ucid, { maxAge: LOGIN_MAX_AGE, httpOnly: false });
        res.cookie('nickname', nickname, { maxAge: LOGIN_MAX_AGE, httpOnly: false });
        res.cookie('account', account, { maxAge: LOGIN_MAX_AGE, httpOnly: false });
        res.send(API_RES.showResult({ ucid, nickname, account, avatarUrl, registerType }))
    }else {
        res.send(API_RES.showError('密码错误', CODE.PASSWORD_ERROR));
    }
}

export default {
    ...normalLogin,
    ...ucLogin,
    ...login,
    ...logout,
    ...getLoginType,  // 获取默认的登录方式
    // ...siteLogin, // 这个是万能登录 user: {}
}