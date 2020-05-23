import Base from '~/src/commands/base';
import moment from 'moment';
import DATE_FORMAT from '~/src/constants/date_format';



class GenerateTemplateSQL {
    static get signature() {
        return `
       Utils:TemplateSQL
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
            this.log('catch error')
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

    async execute(args, options){
        let projectIdList = ['1'];
        let startAtYm = moment().format('YYYYMM');
        let finishAtYm = moment().format('YYYYMM');
        let commonSqlContent = '';

        for(let tableName of [

        ]){
            let content = generate(tableName);
            
        }
    }
}

export default GenerateTemplateSQL;