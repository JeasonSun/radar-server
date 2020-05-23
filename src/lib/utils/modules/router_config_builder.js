import API_RES from '~/src/constants/api_res';
import CODE from '~/src/constants/code';
import Logger from '~/src/lib/logger';

const METHOD_TYPE_GET = 'get';
const METHOD_TYPE_POST = 'post';

function routerConfigBuilder(url ='/', methodType = METHOD_TYPE_GET, func, needProjectId = true, needLogin = true){
    let routerConfig = {};
    routerConfig[url] = {
        methodType, 
        func: (req, res, next) => {
            // 封装一层， 统一加上catch代码
            return func(req, res, next).catch( e => {
                Logger.error('error.message =>', e.message, '\nerror.stack =>', e.stack);
                res.status(500).send(API_RES.showError('服务器错误', CODE.SYSTEM_ERROR, e.stack))
            })
        },
        needLogin,
        needProjectId
    }
    return routerConfig;
}

export default{
    routerConfigBuilder,

    // 方法常量
    METHOD_TYPE_GET,
    METHOD_TYPE_POST 
}
