import LIpip from '~/src/lib/ipip';

const camel2under = function (name) {
    return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}
const under2Camel = function (name) {
    return name.replace(/\_(\w)/g, function (all, letter) {
        return letter.toUpperCase();
    });
}
/**
 * 延迟执行函数, 返回一个 Promise
 * @param {number} ms
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const ip2Locate = LIpip.ip2Locate;

/** 
 * 处理空对象
*/
const handleEmptyData = (obj = {}) => {
    var newObj = {};
    if (typeof (obj) === 'object') {
        Object.keys(obj).map(key => {
            if (obj[key]) {
                newObj[key] = obj[key];
            }
        })
    }
    return newObj;
}


export default {
    camel2under,
    under2Camel,
    sleep,
    ip2Locate,
    handleEmptyData
}