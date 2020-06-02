
import Base from '~/src/commands/base';
import DATE_FORMAT from '~/src/constants/date_format';
import Alert from '~/src/lib/utils/modules/alert';
import AlarmConfig from '~/src/configs/alarm';
import moment from 'moment';

class ParseBase extends Base {

    static get signature() {
        return `
        Parse:Base 
        {startAtYmdHi:日志扫描范围上限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}
        {endAtYmdHi:日志扫描范围下限${DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE}格式}`
    }

    static get description() {
        return '[按天] 解析Nginx日志，Base解析'
    }

    constructor() {
        super();

        // 初始化属性（目前只能在constructor里注册属性）

        // 统一按项目进行统计
        this.projectMap = new Map();
        this.startAtMoment = null;
        this.endAtMoment = null;

        this.DATE_FORMAT_ARGUMENTS = DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE;
        this.DATE_FORMAT_DISPLAY = DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE;

    }

    async execute(args, options) {
        let { startAtYmdHi, endAtYmdHi } = args;
        if (this.isArgumentsLegal(args, options) === false) {
            this.warn('参数不正确，自动退出');
            Alert.sendMessage(AlarmConfig.WATCH_UCID_LIST_DEFAULT, `${this.constructor.name}参数不正确, 自动退出`);
            return false;
        }

        this.startAtMoment = moment(startAtYmdHi, this.DATE_FORMAT_ARGUMENTS);
        this.endAtMoment = moment(endAtYmdHi, this.DATE_FORMAT_ARGUMENTS);
        this.log(`开始分析${this.startAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':00'}~${this.endAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':59'}范围内的记录`);
        let startAt = this.startAtMoment.unix();
        let endAt = this.endAtMoment.unix();
        await this.parseLog(startAt, endAt);
        // this.log('全部数据处理完毕, 存入数据库中');
        // let { totalRecordCount, processRecordCount, successSaveCount } = await this.save2DB();
        // this.log(`${this.startAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':00'}~${this.endAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':59'}范围内日志录入完毕, 共记录数据${processRecordCount}/${totalRecordCount}条, 入库成功${successSaveCount}条`);
    }

    /**
     * [必须覆盖]将数据同步到数据库中
     */
    async save2DB() {
        this.mustBeOverride();
        let processRecordCount = 0;
        let successSaveCount = 0;
        let totalRecordCount = this.getRecordCountInProjectMap();

        // 处理的时候调一下这个方法, 专业打印处理进度
        this.reportProcess(processRecordCount, successSaveCount, totalRecordCount);


        return { totalRecordCount, processRecordCount, successSaveCount };
    }

    /**
     * [必须覆盖]统计 projectUvMap 中的记录总数
     */
    getRecordCountInProjectMap() {
        this.mustBeOverride();
        let totalCount = 0;
        // for (let [projectId, countAtMap] of projectMap) {
        //   for (let [countAtTime, distribution] of countAtMap) {
        //     totalCount = totalCount + 1
        //   }
        // }
        return totalCount;
    }

    /**
     * [可覆盖]检查请求参数, 默认检查传入的时间范围是否正确, 如果有自定义需求可以在子类中进行覆盖
     * @param {*} args
     * @param {*} options
     * @return {Boolean}
     */
    isArgumentsLegal(args, options) {
        let { startAtYmdHi, endAtYmdHi } = args

        let startAtMoment = moment(startAtYmdHi, DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE)
        let endAtMoment = moment(endAtYmdHi, DATE_FORMAT.COMMAND_ARGUMENT_BY_MINUTE)
        if (moment.isMoment(startAtMoment) === false || startAtMoment.isValid() === false) {
            let message = `startAtYmdHi参数不正确 => ${startAtYmdHi}`
            this.warn(message)
            Alert.sendMessage(AlarmConfig.WATCH_UCID_LIST_DEFAULT, message)
            return false
        }
        if (moment.isMoment(endAtMoment) === false || endAtMoment.isValid() === false) {
            let message = `endAtYmdHi参数不正确 =>${endAtYmdHi}`
            this.warn(message)
            Alert.sendMessage(AlarmConfig.WATCH_UCID_LIST_DEFAULT, message)
            return false
        }
        if (startAtMoment.unix() > endAtMoment.unix()) {
            let message = `结束时间小于开始时间 :  ${startAtYmdHi} => ${startAtMoment.unix()} endAtYmdHi =>  ${endAtMoment.unix()}`
            this.warn(message)
            Alert.sendMessage(AlarmConfig.WATCH_UCID_LIST_DEFAULT, message)
            return false
        }
        return true
    }


    mustBeOverride() {
        this.warn('注意, 这里有个方法没有覆盖')
        this.warn('当场退出←_←')
        process.exit(0)
    }

    /**
     * 汇报进度
     * @param {*} processRecordCount
     * @param {*} successSaveCount
     * @param {*} totalRecordCount
     */
    reportProcess(processRecordCount, successSaveCount, totalRecordCount, tableName = '') {
        let insertTable = ''
        if (tableName) {
            insertTable = `, 入库${tableName}`
        }
        if (processRecordCount % 100 === 0) {
            this.log(`当前已处理${processRecordCount}/${totalRecordCount}条记录${insertTable}, 已成功${successSaveCount}条`)
        }
    }
    
}

export default ParseBase;
