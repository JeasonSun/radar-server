import Base from '~/src/commands/base';
import shell from 'shelljs';
import _ from 'lodash';
import Util from '~/src/lib/utils/modules/util';
import Alert from '~/src/lib/utils/modules/alert';
import WatchIdList from '~/src/configs/alarm';
import schedule from 'node-schedule'

class TaskManager extends Base {
    static get signature() {
        return `
     Task:Manager
     `
    }

    static get description() {
        return '任务调度主进程, 只能启动一次'
    }

    async handle(args, options) {
        this.log('任务主进程启动');
        this.log('关闭其他TaskManager进程');
        await this.closeOtherTaskManager();
        this.log('其他TaskManager进程已关闭');
        this.log('避免当前还有正在运行的save2Log命令, 等待30s');
        this.log('开始休眠');
        for (let i = 0; i < 5; i++) { // TODO: 开发时候先写5秒，实际需要30s
            await Util.sleep(1 * 1000);
            this.log(`休眠中, 第${i + 1}秒`);
        }
        this.log('休眠完毕');
        this.log('开始注册cron任务');

        // 注册定时任务
        /**
         * https://www.jianshu.com/p/8d303ff8fdeb
         * 每分钟的第30秒触发： '30 * * * * *'
         * 每小时的1分30秒触发 ：'30 1 * * * *'
         * 每天的凌晨1点1分30秒触发 ：'30 1 1 * * *'
         * 每月的1日1点1分30秒触发 ：'30 1 1 1 * *'
         * 2016年的1月1日1点1分30秒触发 ：'30 1 1 1 2016 *'
         * 每周1的1点1分30秒触发 ：'30 1 1 * * 1'
         */
        // this.log('注册每1分钟执行一次的任务');
        // this.registerTaskRepeatPer1Minute();

        // this.log('注册每24小时执行一次的任务');
        // this.registerTaskRepeatPer24Hour();

        // this.log('注册每天的凌晨0点1分0秒触发');
        // this.registerTaskRepeatPerDayStart();

        this.log('全部定时任务注册完毕, 等待执行');
        

    }

    /**
     * 关闭其他所有的TaskManager进程
     */
    async closeOtherTaskManager() {
        let taskManagerPidList = await this.getOtherTaskManagerPidList();
        this.log('当前process.pid =>', process.pid);
        this.log(`其余TaskManger进程Pid列表 => `, taskManagerPidList);
        this.log('执行kill操作, 关闭其余进程');
        for (let pid of taskManagerPidList) {
            this.log(`kill pid => ${pid}`);
            try {
                process.kill(pid);
            } catch (error) {
                let message = `TaskManger进程pid => ${pid} kill失败, 该pid不存在或者没有权限kill`;
                this.log(message);
            }
        }
        this.log('kill操作执行完毕, 休眠3s, 再次检测剩余TaskManager进程数');
        await Util.sleep(3 * 1000);
        this.log('开始检测剩余TaskManager进程数');
        taskManagerPidList = await this.getOtherTaskManagerPidList();

        if (taskManagerPidList.length === 0) {
            this.log('剩余TaskManager为空, 可以继续执行任务调度进程');
            return true;
        }
        // PM2 3.2.2 有bug, 无法保证TaskManager只有一个实例, 因此需要主动进行检测
        // 否则, 直接终止该进程
        let alertMessage = '仍然有残留TaskManager进程, 程序不能保证正常执行, 自动退出. 剩余 TaskManager pid List => ' + JSON.stringify(taskManagerPidList);
        this.warn(alertMessage);
        Alert.sendMessage(WatchIdList.WATCH_UCID_LIST_DEFAULT, alertMessage);
        // 花式自尽
        process.kill(process.pid);
        process.exit(1);
    }

    async getOtherTaskManagerPidList() {
        let command = 'ps aS|grep Task:Manager|grep node|grep radar|grep -v grep | grep -v  \'"Task:Manager"\'';
        this.log(`检测命令 => ${command}`);
        let rawCommandOutput = shell.exec(command, {
            async: false,
            silent: true,
        })
        let rawCommandOutputList = rawCommandOutput.split('\n');

        let taskManagerPidList = [];
        for (let rawCommandOutput of rawCommandOutputList) {
            let commandOutput = _.trim(rawCommandOutput);
            commandOutput = _.replace(commandOutput, '\t', ' ');
            let pid = commandOutput.split(' ')[0];
            pid = parseInt(pid);
            if (_.isNumber(pid) && pid > 0) {
                if (pid !== process.pid) {
                    taskManagerPidList.push(pid);
                }
            }
        }
        this.log('检测其他Pid结束', taskManagerPidList);
        return taskManagerPidList;
    }

    async registerTaskRepeatPer1Minute() {
        let that = this;
        // 每分钟的第0秒启动
        schedule.scheduleJob('0 */1 * * * *', function () {
            that.log('registerTaskRepeatPer1Minute 开始执行');

        })

    }


    async registerTaskRepeatPer24Hour() {

    }

    async registerTaskRepeatPerDayStart() {
        let that = this;

        schedule.scheduleJob('0 1 0 * * *', function () {
            that.log('registerTaskRepeatPer1Minute 开始执行');

        })
    }

}

export default TaskManager;