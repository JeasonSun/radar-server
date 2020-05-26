import md5 from 'md5';
import _ from 'lodash';
import { getUnixTime } from 'date-fns';
import Knex from '~/src/lib/mysql';
import { customAlphabet } from 'nanoid';

const MD5_SALT = '104734278123812323234';
const DEFAULT_PASSWORD = 'radar@123';

const ROLE_DEV = 'dev';
const ROLE_ADMIN = 'admin';

const REGISTER_TYPE_THIRD = 'third';
const REGISTER_TYPE_SITE = 'site'; // 默认注册方式

const nanoRule = customAlphabet('1234567890', 8);

// TODO: 修改一下默认头像
const DEFAULT_AVATAR_URL = '';

const BASE_TABLE_NAME = 't_o_user';
const TABLE_COLUMN = [
    `id`,
    `ucid`,
    `account`,
    `email`,
    `password_md5`,
    `nickname`,
    `role`,
    `register_type`,
    `avatar_url`,
    `mobile`,
    `is_delete`,
    `create_time`,
    `update_time`
];

/** 
 * 对外展示的字段
*/
const DISPLAY_TABLE_COLUMN = [
    `ucid`,
    `account`,
    `email`,
    `nickname`,
    `role`,
    `register_type`,
    `avatar_url`,
    `mobile`
]

function hash(content) {
    let v1ResultMd5 = md5(`${content}_${MD5_SALT}`)
    let v2ResultMd5 = md5(`${v1ResultMd5}_${MD5_SALT}`)
    let v3ResultMd5 = md5(`${v2ResultMd5}_${MD5_SALT}`)
    return v3ResultMd5
}

function getTableName() {
    return BASE_TABLE_NAME
}

function parseAccountToUcid(account) {
    let ucid = ''
    let accountMd5 = md5(account)
    accountMd5 = accountMd5.slice(0, 16)
    for (let index = 0; index < accountMd5.length; index++) {
        ucid += accountMd5.charCodeAt(index)
    }
    return ucid
}

async function createUcid(){
    let nanoid = +('1' + nanoRule());// 固定1开头的数字
    let existUserByUcid = await getByUcid(nanoid);
    if (_.isEmpty(existUserByUcid) === false) { 
       nanoid = await createUcid();
    } else {
        return nanoid;
    }
}

/**
 * @description 创建用户
 * @param {*} account  账号
 * @param {*} userInfo 用户信息
 * @returns Boolean
 */
async function register(account, userInfo) {
    const tableName = getTableName();
    // 没有ucid，则把account转化为ucid；去除，改为使用nanoid生成ucid
    // let parseAccount = parseAccountToUcid(account);
    let parseAccount = await createUcid();
    let ucid = _.get(userInfo, ['ucid'], parseAccount);
    let email = _.get(userInfo, ['email'], '');
    let passwordMd5 = _.get(userInfo, ['password_md5'], hash(DEFAULT_PASSWORD));
    let nickname = _.get(userInfo, ['nickname'], '');
    let role = _.get(userInfo, ['role'], ROLE_DEV);
    // FIX: 默认注册的时候应该是site
    let registerType = _.get(userInfo, ['register_type'], REGISTER_TYPE_SITE);
    let mobile = _.get(userInfo, ['mobile'], '');
    let avatarUrl = _.get(userInfo, ['avatarUrl'], DEFAULT_AVATAR_URL);

    // ucid和account不能为空
    if (ucid.length === 0 || account === '') {
        return false;
    }

    // 检查account
    // FIX:若用户已存在，不允许注册
    let existUserByAccount = await getByAccount(account);
    if (_.isEmpty(existUserByAccount) === false) { // 存在该账号
        return false;
    }
    
    let nowAt = getUnixTime(new Date());
    let insertData = {
        ucid,
        account,
        email,
        password_md5: passwordMd5,
        nickname,
        role,
        register_type: registerType,
        avatar_url: avatarUrl,
        mobile,
        is_delete: 0,
        create_time: nowAt,
        update_time: nowAt
    }
    let insertResult = await Knex
        .returning('id')
        .insert(insertData)
        .into(tableName)
        .catch(e => { return [] })
    let insertId = _.get(insertResult, [0], 0)
    return insertId > 0;

}



/**
 * 根据账户获取用户信息
 * @param {String} account
 * @return {Object}
 */
async function getByAccount(account) {
    const tableName = getTableName()

    const result = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('account', account);

    let user = _.get(result, [0], {});
    return user;
}
async function getByUcid(ucid) {
    const tableName = getTableName()

    const result = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('ucid', ucid);

    let user = _.get(result, [0], {});
    return user;
}

/**
 * 更新记录
 * @param {number} id
 * @param {object} rawUpdateData = {}
 */
async function update(ucid, rawUpdateData) {
    let nowAt = getUnixTime(new Date())

    let updateRecord = {}
    // 允许更新的字段范围：
    for (let key of [
        'email',
        'password_md5',
        'nickname',
        'role',
        'register_type',
        'avatar_url',
        'mobile',
        'is_delete'
    ]) {
        if (_.has(rawUpdateData, [key])) {
            updateRecord[key] = rawUpdateData[key]
        }
    }

    updateRecord['update_time'] = nowAt
    const tableName = getTableName()
    const affectRows = await Knex(tableName)
        .update(updateRecord)
        .where('ucid', ucid);
    return affectRows > 0;
}

/**
 * 根据账户获取网站注册用户（普通用户）的信息
 * @param {String} account
 * @return {Object}
 */
async function getSiteUserByAccount(account) {
    const tableName = getTableName()

    const result = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('account', account)
        .andWhere('register_type', REGISTER_TYPE_SITE);
    let user = _.get(result, [0], {});
    return user;
}

/**
 * 检查用户身份是否是管理员
 * @param {*} ucid
 */
async function isAdmin(ucid) {
    let user = await get(ucid);
    let isExist = _.get(user, ['is_delete'], 1) === 0;
    let isAdmin = _.get(user, ['role'], ROLE_DEV) === ROLE_ADMIN;
    if (isExist && isAdmin) {
        return true
    }
    return false
}

/**
 * 通过ucid获取用户信息
 * @param {String} ucid
 */
async function get(ucid) {
    const tableName = getTableName();

    const result = await Knex
        .select(TABLE_COLUMN)
        .from(tableName)
        .where('ucid', ucid);
    let user = _.get(result, [0], {});
    return user;
}


function formatRecord(rawItem) {
    let item = {};
    for (let key of DISPLAY_TABLE_COLUMN) {
        if (_.has(rawItem, [key])) {
            item[key] = rawItem[key];
        }
    }
    return item;
}

export default {
    register,
    hash,
    getByAccount,
    formatRecord,
    getSiteUserByAccount,
    get, // 通过ucid获取用户信息
    isAdmin
}