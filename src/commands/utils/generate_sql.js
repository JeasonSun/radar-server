import Base from '~/src/commands/base';
import moment from 'moment';
import _ from 'lodash';
import DATE_FORMAT from '~/src/constants/date_format';
import { TABLE_TEMPLATE, SINGLE_TABLE_ARRAY, MULTI_TABLE_ARRAY, SINGLE_T_O_USER} from '~/src/commands/utils/sql_maps';

const SQL_DATE_FORMAT_YM = 'YYYYMM';

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
        return '生成项目在指定日期范围内的建表SQL [demo] Utils:GenerateSQL 1,2 2020-1 2020-2'
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
        for (let tableName of SINGLE_TABLE_ARRAY) {
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
                for (let tableName of MULTI_TABLE_ARRAY) {
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