import Base from '~/src/commands/base';
import moment from 'moment';
import _ from 'lodash';
import DATE_FORMAT from '~/src/constants/date_format';

const SQL_DATE_FORMAT_YM = 'YYYYMM';


const SINGLE_T_O_USER = 't_o_user'; // 用户表

// 需要分表；
// 异常数据表，按(项目-月)分表，只有最基础的错误信息，ext字段需要到详情表中单独获取，命名规则：t_o_monitor_projectId_YYYYMM;
const MULTI_T_O_MONITOR = 't_o_monitor';
// 异常数据的ext信息，按照(项目-月)分表，命名规则：t_o_monitor_ext_projectId_YYYYMM;
const MULTI_T_O_MONITOR_EXT = 't_o_monitor_ext';
// uv记录表, 按项目&月分表,最小统计粒度为小时 命名规则: t_o_uv_record_项目id_YYYYMM
const MULTI_T_O_UV_RECORD = 't_o_uv_record';
// 城市数据的扩展信息, 按项目月分表, 命名规则: t_r_city_distribution_项目id_YYYYMM, 获取数据时, 以记录创建时间和记录所属项目id, 决定distribute记录所在表
const MULTI_T_R_CITY_DISTRIBUTION = 't_r_city_distribution';
// 性能指标表, 按项目按月分表, 命名规则: t_r_performance_项目id_YYYYMM, 获取数据时, 以记录创建时间和记录所属项目id, 决定distribute记录所在表
const MULTI_T_R_PERFORMANCE = 't_r_performance';
// 设备记录表, 按项目分表, 最小统计粒度为月, 命名规则: t_o_device_info_项目id
const MULTI_T_O_SYSTEM_COLLECTION = 't_o_system_collection';
// 用户首次登陆表, 用于统计新课, 按项目分表, 命名规则: t_o_customer_first_login_at_项目id
const MULTI_T_O_USER_FIRST_LOGIN_AT = 't_o_user_first_login_at';
// 错误统计表,用于统计错误类型，错误名字
const MULTI_T_R_ERROR_SUMMARY = 't_r_error_summary';

/**************  表模板 ********************/
let TABLE_TEMPLATE = {};
TABLE_TEMPLATE[SINGLE_T_O_USER] = `(
  \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '记录id',
  \`ucid\` varchar(50) NOT NULL DEFAULT '' COMMENT '贝壳ucid',
  \`account\` varchar(50) NOT NULL DEFAULT '' COMMENT '账户名,不能重复',
  \`email\` varchar(50) NOT NULL DEFAULT '' COMMENT '邮箱',
  \`password_md5\` varchar(32) NOT NULL DEFAULT '' COMMENT 'md5后的password',
  \`nickname\` varchar(20) NOT NULL DEFAULT '' COMMENT '昵称',
  \`role\` varchar(50) NOT NULL DEFAULT 'dev' COMMENT '角色(dev => 开发者,admin => 管理员)',
  \`register_type\` varchar(20) NOT NULL DEFAULT 'site' COMMENT '注册类型(site => 网站注册, third => 第三方登录)',
  \`avatar_url\` varchar(200) NOT NULL DEFAULT 'http://ww1.sinaimg.cn/large/00749HCsly1fwofq2t1kaj30qn0qnaai.jpg' COMMENT '头像地址, 默认使用贝壳logo',
  \`mobile\` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  \`is_delete\` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否删除(1 => 是, 0 => 否)',
  \`create_time\` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库创建时间',
  \`update_time\` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_ucid\` (\`ucid\`),
  UNIQUE KEY \`uniq_account\` (\`account\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';
`;


TABLE_TEMPLATE[MULTI_T_O_MONITOR] = ``;
TABLE_TEMPLATE[MULTI_T_O_MONITOR_EXT] = ``;
TABLE_TEMPLATE[MULTI_T_O_UV_RECORD] = ``;
TABLE_TEMPLATE[MULTI_T_R_CITY_DISTRIBUTION] = ``;
TABLE_TEMPLATE[MULTI_T_R_PERFORMANCE] = ``;
TABLE_TEMPLATE[MULTI_T_O_SYSTEM_COLLECTION] = ``;
TABLE_TEMPLATE[MULTI_T_O_USER_FIRST_LOGIN_AT] = ``;
TABLE_TEMPLATE[MULTI_T_R_ERROR_SUMMARY] = ``;


function generate(baseTableName, projectId = '', tableTime = '') {
    // 获取模板
    let content = TABLE_TEMPLATE[baseTableName];

    // 生成表名
    let finalTableName = `${baseTableName}`;
    // 需要分表时候，按照规则创建表名；
    switch (baseTableName) {
        default:
            break;
    }
    return `
    CREATE TABLE IF NOT EXISTS \`${finalTableName}\` ${content}
    `;

}

class GenerateSQL extends Base {
    static get signature() {
        return `
       Utils:GenerateSQL
       {projectIdList:项目id列表,逗号分割}
       {startAtYm:建表日期开始时间(包括该时间),${DATE_FORMAT.COMMAND_ARGUMENT_BY_MONTH}格式}
       {finishAtYm:建表日期结束时间(包括该时间),${DATE_FORMAT.COMMAND_ARGUMENT_BY_MONTH}格式}
       `
    }

    static get description() {
        return '生成项目在指定日期范围内的建表SQL'
    }

    /**
   * 覆盖父类方法, 避免再手工删除冗余日志记录
   * @param {*} args
   * @param {*} options
   */
    async handle(args, options) {
        await this.execute(args, options).catch(e => {
            this.log(e.stack)
        })
    }

    /**
     * 覆盖父类方法, 避免再手工删除冗余日志记录
     * @param {*} args
     * @param {*} options
     */
    async log(message) {
        console.log(message)
    }

    async execute(args, options) {
        let { projectIdList, startAtYm, finishAtYm } = args;
        projectIdList = projectIdList.split(',');
        if (_.isEmpty(projectIdList)) {
            this.warn('自动退出：projectIdList为空 =>', projectIdList);
            return false;
        }
        let commonSqlContent = `
-- Adminer 4.3.1 MySQL dump
-- 时间类型只有以下模式
--
-- year => YYYY
-- month => YYYY-MM
-- day => YYYY-MM-DD
-- hour => YYYY-MM-DD_HH
-- minute => YYYY-MM-DD_HH:mm
-- second => YYYY-MM-DD_HH:mm:ss
-- 
-- 字段规范
-- 使用下划线区分
-- 数字默认值一般为0
-- 字符串默认值一般为空字符串
-- 数据库关键字/可能为关键字的字段前, 加c_前缀
-- url => varchar(255)
-- id => bigint(20)
-- 时间戳 => bigint(20)
-- create_time => bigint(20) 数据库中记录创建的时间
-- update_time => bigint(20) 数据库中记录更新的时间
-- count_at_time => varchar(30)  文字型时间, 格式根据count_type而定
-- count_type => varchar(20)  时间格式(year/month/day/hour/minute/second)

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

`
        for (let tableName of [
            // SINGLE_T_O_PROJECT,
            // SINGLE_T_R_BEHAVIOR_DISTRIBUTION,
            // SINGLE_T_R_DURATION_DISTRIBUTION,
            // SINGLE_T_R_HTTP_ERROR_DISTRIBUTION,
            // SINGLE_T_R_PAGE_VIEW,
            // SINGLE_T_R_SYSTEM_BROWSER,
            // SINGLE_T_R_SYSTEM_RUNTIME_VERSION,
            // SINGLE_T_R_SYSTEM_DEVICE,
            // SINGLE_T_R_SYSTEM_OS,
            // SINGLE_T_R_UNIQUE_VIEW,
            // SINGLE_T_O_ALARM_CONFIG,
            SINGLE_T_O_USER,
            // SINGLE_T_O_PROJECT_MEMBER,
            // SINGLE_T_O_NEW_USER_SUMMARY,
            // SINGLE_T_R_ALARM_LOG
        ]) {
            let content = generate(tableName);
            commonSqlContent = `${commonSqlContent}\n${content}`;
        }

        let finishAtMoment = moment(finishAtYm, DATE_FORMAT.COMMAND_ARGUMENT_BY_MONTH);

        let sqlContent = '-- --------分表部分---------';

        for (let projectId of projectIdList) {
            // 生成时间范围之内的数据表
            for (let currentAtMoment = moment(startAtYm, DATE_FORMAT.COMMAND_ARGUMENT_BY_MONTH);
                currentAtMoment.isBefore(finishAtMoment.clone().add(1, 'months')); currentAtMoment = currentAtMoment.clone().add(1, 'months')) {
                let currentAtYM = currentAtMoment.format(SQL_DATE_FORMAT_YM);
                sqlContent = `${sqlContent}\n-- SQL for projectId: ${projectId} Time: ${currentAtYM} => \n`;
                for (let tableName of [
                    // MULTI_T_O_MONITOR,
                    // MULTI_T_O_MONITOR_EXT,
                    // MULTI_T_O_UV_RECORD,
                    // MULTI_T_R_CITY_DISTRIBUTION,
                    // MULTI_T_R_PERFORMANCE,
                    // MULTI_T_O_SYSTEM_COLLECTION,
                    // MULTI_T_O_USER_FIRST_LOGIN_AT,
                    // MULTI_T_R_ERROR_SUMMARY
                ]) {
                    let content = generate(tableName, projectId, currentAtYM)
                    sqlContent = `${sqlContent}\n${content}`
                }
            }
        }
        let insertProjectInfo = ``

        this.log(`${commonSqlContent}\n${sqlContent}\n${insertProjectInfo}\n`);



    }
}


export default GenerateSQL;