import knex from 'knex';
import Alert from '~/src/lib/utils/modules/alert';
import sqlConfig from '~/src/configs/mysql';
import WatchIdList from '~/src/configs/alarm';

const Knex = knex({
    client: 'mysql',
    connection: {
        host: sqlConfig.host,
        port: sqlConfig.port,
        database: sqlConfig.database,
        user: sqlConfig.user,
        password: sqlConfig.password
    },
    debug: false,
    pool: {
        max: 10,
        min: 0,
        // 由于存在资源池, 导致句柄不被释放, 程序不能退出
        // 因此将最小句柄数设为0, 每100ms检查一次是否有超过120ms未被使用的资源
        // 以便句柄的及时回收
        // free resouces are destroyed after this many milliseconds
        idleTimeoutMillis: 100,
        // how often to check for idle resources to destroy
        reapIntervalMillis: 150
    },
    acquireConnectionTimeout: 60000,
    log: {
        error(message) {
            Alert.sendMessage(WatchIdList.WATCH_UCID_LIST_DEFAULT, `数据库操作异常 => ${message}`)
        }
    }
})
export default Knex;