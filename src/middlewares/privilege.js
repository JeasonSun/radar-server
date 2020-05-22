import _ from 'lodash';
import Auth from '~/src/lib/auth'

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

export default {
    appendProjectInfo,
    appendUserInfo
}