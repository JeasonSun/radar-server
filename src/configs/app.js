import path from 'path'
import env from '~/src/configs/env';


const production = {
    name: 'Radar监控平台开发环境',
    port: 3080,
    proxy: false,
    absoluteLogPath: path.resolve(__dirname, '../../', 'log')
}

// 下面的特定环境可以深度合并到上面的默认环境
// 线上环境是上面的默认环境，不要乱改哦

// 开发环境配置
const development = {
    name: 'Radar监控平台开发环境',
    port: 3080,
    proxy: false,
    absoluteLogPath: path.resolve(__dirname, '../../', 'log')
}
// 测试环境配置
const testing = {
    name: 'Radar监控平台开发环境',
    port: 3080,
    proxy: false,
    absoluteLogPath: path.resolve(__dirname, '../../', 'log')
}

let config = {
    development,
    testing,
    production
}

export default config[env]