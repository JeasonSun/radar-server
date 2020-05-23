export default {
    /** 
     * 1) AA 消息级别码 2 位,
     * 
     * 2) BB 模块标识码 2 位, 
     * 
     * 3) CC 消息状态码 2 位, 
    */
    /** 
     * 000000
    */
   SUCCESS: 0,
    /** 
    * 系统相关返回码： 100000 - 199999
    * 
    */
    SYSTEM_ERROR: 100000, // 系统错误

    // 账号相关
    NOT_LOGIN: 100101, // 没有登录
    NO_FORBIDDEN: 100102, // 没有权限
    ACCOUNT_EXIST: 100103, //账号已经存在，
    ACCOUNT_NO_EXIST: 100104, //账户不存在，或者已经注销
    REGISTER_ERROR: 100105, //注册失败
    PASSWORD_ERROR: 100106, //密码错误


    TOKEN_MISS: 100110, // 缺少token
    TOKEN_ILLEGAL: 100111, // 非法token，token错误
    TOKEN_EXPIRED: 100112, // token过期

    URL_REDIRECT: 100301, // URL跳转


    /** 
    * 参数相关返回码： 200000 - 299999
    * 
    */
    PARAM_ERROR: 200000, //缺少参数response_type或response_type非法。
    PARAM_CID: 200101, // 缺少参数client_id。

  

    /** 
    * 数据相关返回码： 300000 - 399999
    * 
    */
    DATA_ERROR: 300000, // 数据错误


}