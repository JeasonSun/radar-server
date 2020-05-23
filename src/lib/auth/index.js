import _ from 'lodash';
import { getUnixTime } from 'date-fns';
import md5 from 'md5';
import Logger from '~/src/lib/logger';

// TODO: 需要把MD5_SALT提到constant配置中。
const MD5_SALT = 'qwertyuiopasdfghjklzxcvbnm';


function encodeBase64(content) {
    return Buffer.from(content).toString('base64');
}

function decodeBase64(content) {
    return Buffer.from(content, 'base64').toString();
}

function generateCheckSum(content) {
    let hash1 = md5(content + MD5_SALT);
    return md5(MD5_SALT + hash1);
}

/**
 * 解析cookie中的token字段, 返回用户信息, 没有登录返回空对象
 * @param {Object} token
 * @return {Object}
 */
function parseToken(token) {
    let jsonInfo = decodeBase64(token);

    let info = {};
    try {
        info = JSON.parse(jsonInfo);
    } catch (e) {
        Logger.log('token-Info信息不是标准json');
        return {};
    }

    let checksum = generateCheckSum(info.user);
    if (checksum !== info.checksum) {
        return {};
    }

    let user = JSON.parse(info.user);

    let ucid = _.get(user, ['ucid'], 0)
    let nickname = _.get(user, ['nickname'], '')
    let account = _.get(user, ['account'], '')
    let loginAt = _.get(user, ['loginAt'], 0)

    return {
        ucid,
        nickname,
        account,
        loginAt
    }
}

function generateToken(ucid, account, nickname) {
    let loginAt = getUnixTime(new Date());
    let user = JSON.stringify({
        ucid,
        nickname,
        account,
        loginAt
    })
    // 利用checksum和loginAt避免登录信息被篡改
    let checksum = generateCheckSum(user)
    let infoJson = JSON.stringify({
        user,
        checksum
    })
    let info = encodeBase64(infoJson);
    return info;
}

export default {
    parseToken,
    generateToken
}