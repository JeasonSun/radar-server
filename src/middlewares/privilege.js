import _ from 'lodash';
import Auth from '~/src/lib/auth';
import API_RES from '~/src/constants/api_res';
import Logger from '~/src/lib/logger';

/**
 * 将用户信息更新到req对象中 req.radar req.user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function appendUserInfo(req, res, next) {
    let cookies = req.cookies;
    let token = _.get(cookies, ['radar_token'], '');
    let user = Auth.parseToken(token);
    //将用户信息添加到req.radar(只添加信息, 在check里在检查是否需要登录)
    _.set(req, ['radar', 'user'], user);
    next();
}


function appendProjectInfo(req, res, next) {
    let path = req.path;
    if (_.startsWith(path, '/project')) {
        let projectId = parseInt(_.get(path.split('/'), [2], 0));
        _.set(req, ['radar', 'project', 'projectId'], projectId);
    }
    next();
}



/**
 * 检查用户是否拥有该项目权限
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function checkPrivilege(req, res, next) {
    Logger.log('检测项目权限');

    let ucid = _.get(req, ['radar', 'user', 'ucid'], 0)
    let projectId = _.get(req, ['radar', 'project', 'projectId'], 0)
    // 查询数据库
    let hasPrivilege = await MProjectMember.hasPrivilege(projectId, ucid);

    if (hasPrivilege === false) {
        Logger.log('没有项目权限')
        res.send(API_RES.noPrivilege())
        return
    }
    next()
}


/**
 * 检查用户是否已登录
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
// TODO: 并不是所有有token，就算登录了
// 在开发过程中，由于修改了一下token字段，但是token加密规则没有改变，所以还是能正常解析token，但是实际这个用户已经不存在了。
// 暂时不解决，因为token理论上不会被伪造。
function checkLogin(req, res, next) {
    
    let ucid = _.get(req, ['radar', 'user', 'ucid'], 0)
    if (ucid === 0) {
        Logger.log('没有登录')
        res.send(API_RES.needLoginIn())
        return
    }
    next()
}

export default {
    appendProjectInfo,
    appendUserInfo,
    checkPrivilege,
    checkLogin
}