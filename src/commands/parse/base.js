
import Base from '~/src/commands/base';
import DATE_FORMAT from '~/src/constants/date_format';
import Alert from '~/src/lib/utils/modules/alert';
import AlarmConfig from '~/src/configs/alarm';
import moment from 'moment';
import LKafka from '~/src/lib/kafka';
import fs from 'fs';
import { readLine } from 'lei-stream';

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
            Alert.sendMessage(AlarmConfig.WATCH_UCID_LIST_DEFAULT, `${this.constructor.name}参数不正确，自动退出`);
            return false;
        }
        this.startAtMoment = moment(startAtYmdHi, this.DATE_FORMAT_ARGUMENTS);
        this.endAtMoment = moment(endAtYmdHi, this.DATE_FORMAT_ARGUMENTS);
        this.log(`开始分析${this.startAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':00'}~${this.endAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':59'}范围内的记录`);
        let startAt = this.startAtMoment.unix();
        let endAt = this.endAtMoment.unix();
        // TIP: 这边把所有数据存在projectMap中，是不是会导致内存占用过高？ 由于fee中是每分钟处理一次，所以，可能还能确保projectMap占用不多，但是如果radar按照1day的时间来处理，应该会出问题。
        await this.parseLog(startAt, endAt);
        this.log('全部数据处理完毕，存入数据库中');
        console.log(this.projectMap);

        let { totalRecordCount, processRecordCount, successSaveCount } = await this.save2DB();
        this.log(`${this.startAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':00'}~${this.endAtMoment.format(this.DATE_FORMAT_DISPLAY) + ':59'}范围内日志录入完毕, 共记录数据${processRecordCount}/${totalRecordCount}条, 入库成功${successSaveCount}条`);
    }

    /**
     * 解析制定时间范围内的日志记录， 并且录入到数据库中
     * @param {*} startAt
     * @param {*} endAt
     * @memberof ParseBase
     */
    async parseLog(startAt, endAt) {
        let that = this;
        for (let currentAt = startAt; currentAt <= endAt; currentAt = currentAt + 60) { // 存储的时候每分钟一个文件， 所以跨度60秒；
            let currentAtMoment = moment.unix(currentAt);
            let absoluteLogUri = LKafka.getAbsoluteLogUriByType(currentAt, LKafka.LOG_TYPE_JSON);
            if (fs.existsSync(absoluteLogUri) === false) {
                // that.log(`log文件不存在, 自动跳过 => ${absoluteLogUri}`);
                continue;
            } else {
                that.log(`开始处理${currentAtMoment.format(that.DATE_FORMAT_DISPLAY)}的记录, log文件地址 => ${absoluteLogUri}`);
            }
            // 确保按照文件顺序逐行读写日志
            await new Promise(function (resolve, reject) {
                let onDataReceive = async (data, next) => {
                    let record = {};
                    try {
                        record = JSON.parse(data)
                    } catch (error) {
                        console.log('parse error===',error, data)
                    }
                    if (that.isLegalRecord(record)) {
                        that.processRecordAndCacheInProjectMap(record);
                    }
                    next();
                }
                let onReadFinish = () => {
                    resolve();
                }
                readLine(fs.createReadStream(absoluteLogUri), {
                    // 换行符，默认\n
                    newline: '\n',
                    // 是否自动读取下一行，默认false
                    autoNext: false,
                    // 编码器，可以为函数或字符串（内置编码器：json，base64），默认null
                    encoding: null
                }).go(onDataReceive, onReadFinish);
                // that.log('处理完毕');
            })
        }
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

    /**
     * [必须覆盖]判断该条记录是不是需要解析的记录
     * 
     */
    isLegalRecord(record) {
        this.mustBeOverride('isLegalRecord');
        return;
    }
    /**
     * [必须覆盖]处理记录, 并将结果缓存在this.ProjectMap中
     */
    async processRecordAndCacheInProjectMap(record) {
        this.mustBeOverride('processRecordAndCacheInProjectMap');
        return false;
    }

    /**
     * [必须覆盖]将数据同步到数据库中
     */
    async save2DB() {
        this.mustBeOverride('save2DB');
        return false;
    }

    /**
    * [必须覆盖]统计 projectMap 中的记录总数
    */
    getRecordCountInProjectMap() {
        this.mustBeOverride('getRecordCountInProjectMap');
        return 0;
    }

    /**
    * 汇报进度,
    * @param {*} processRecordCount 处理中的数据
    * @param {*} successSaveCount 已经成功入库的数据
    * @param {*} totalRecordCount 总数据
    * @param {*} rate 汇报频率
    */
    reportProcess(processRecordCount, successSaveCount, totalRecordCount, tableName = '', rate = 100) {
        let insertTable = ''
        if (tableName) {
            insertTable = `, 入库${tableName}`
        }
        if (processRecordCount % rate === 0) {
            this.log(`当前已处理${processRecordCount}/${totalRecordCount}条记录${insertTable}, 已成功${successSaveCount}条`)
        }
    }

    mustBeOverride(fnName = '') {
        this.warn(`注意, 这里有个方法没有覆盖 ${fnName}`);
        this.warn('当场退出←_←')
        process.exit(0)
    }



}

export default ParseBase;
