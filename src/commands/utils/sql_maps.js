
const SINGLE_T_O_USER = 't_o_user'; // 用户表
const SINGLE_T_O_PROJECT = 't_o_project'; //项目表

const SINGLE_TABLE_ARRAY = [
    SINGLE_T_O_PROJECT,
    // SINGLE_T_R_BEHAVIOR_DISTRIBUTION,
    // SINGLE_T_R_DURATION_DISTRIBUTION,
    // SINGLE_T_R_HTTP_ERROR_DISTRIBUTION,
    // SINGLE_T_R_PAGE_VIEW,
    // SINGLE_T_R_SYSTEM_BROWSER,
    // SINGLE_T_R_SYSTEM_RUNTIME_VERSION,
    // SINGLE_T_R_SYSTEM_DEVICE,
    // SINGLE_T_R_SYSTEM_OS,
    // SINGLE_T_R_UNIQUE_VIEW,
    // SINGLE_T_O_ALARM_CONFIG,
    SINGLE_T_O_USER,
    // SINGLE_T_O_PROJECT_MEMBER,
    // SINGLE_T_O_NEW_USER_SUMMARY,
    // SINGLE_T_R_ALARM_LOG
];

// 需要分表；
// 异常数据表，按(项目-月)分表，只有最基础的错误信息，ext字段需要到详情表中单独获取，命名规则：t_o_monitor_projectId_YYYYMM;
const MULTI_T_O_MONITOR = 't_o_monitor';
// 异常数据的ext信息，按照(项目-月)分表，命名规则：t_o_monitor_ext_projectId_YYYYMM;
const MULTI_T_O_MONITOR_EXT = 't_o_monitor_ext';
// uv记录表, 按项目&月分表,最小统计粒度为小时 命名规则: t_o_uv_record_项目id_YYYYMM
const MULTI_T_O_UV_RECORD = 't_o_uv_record';
// 城市数据的扩展信息, 按项目月分表, 命名规则: t_r_city_distribution_项目id_YYYYMM, 获取数据时, 以记录创建时间和记录所属项目id, 决定distribute记录所在表
const MULTI_T_R_CITY_DISTRIBUTION = 't_r_city_distribution';
// 性能指标表, 按项目按月分表, 命名规则: t_r_performance_项目id_YYYYMM, 获取数据时, 以记录创建时间和记录所属项目id, 决定distribute记录所在表
const MULTI_T_R_PERFORMANCE = 't_r_performance';
// 设备记录表, 按项目分表, 最小统计粒度为月, 命名规则: t_o_device_info_项目id
const MULTI_T_O_SYSTEM_COLLECTION = 't_o_system_collection';
// 用户首次登陆表, 用于统计新课, 按项目分表, 命名规则: t_o_customer_first_login_at_项目id
const MULTI_T_O_USER_FIRST_LOGIN_AT = 't_o_user_first_login_at';
// 错误统计表,用于统计错误类型，错误名字
const MULTI_T_R_ERROR_SUMMARY = 't_r_error_summary';

const MULTI_TABLE_ARRAY = [
    // MULTI_T_O_MONITOR,
    // MULTI_T_O_MONITOR_EXT,
    // MULTI_T_O_UV_RECORD,
    // MULTI_T_R_CITY_DISTRIBUTION,
    // MULTI_T_R_PERFORMANCE,
    // MULTI_T_O_SYSTEM_COLLECTION,
    // MULTI_T_O_USER_FIRST_LOGIN_AT,
    // MULTI_T_R_ERROR_SUMMARY
];

/**************  表模板 ********************/
let TABLE_TEMPLATE = {};
// FIX: ucid varchar(20) fee中创建cuid是通过account md5 -> charAtCode生成的，ucid过长，然后其他表中又写了varchar(20)，导致有些时候Data too long;
TABLE_TEMPLATE[SINGLE_T_O_USER] = `(
  \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '记录id',
  \`ucid\` varchar(20) NOT NULL DEFAULT '' COMMENT 'ucid',
  \`account\` varchar(50) NOT NULL DEFAULT '' COMMENT '账户名,不能重复',
  \`email\` varchar(50) NOT NULL DEFAULT '' COMMENT '邮箱',
  \`password_md5\` varchar(32) NOT NULL DEFAULT '' COMMENT 'md5后的password',
  \`nickname\` varchar(20) NOT NULL DEFAULT '' COMMENT '昵称',
  \`role\` varchar(50) NOT NULL DEFAULT 'dev' COMMENT '角色(dev => 开发者,admin => 管理员)',
  \`register_type\` varchar(20) NOT NULL DEFAULT 'site' COMMENT '注册类型(site => 网站注册, third => 第三方登录)',
  \`avatar_url\` varchar(200) NOT NULL DEFAULT 'http://ww1.sinaimg.cn/large/00749HCsly1fwofq2t1kaj30qn0qnaai.jpg' COMMENT '头像地址, 默认logo',
  \`mobile\` varchar(20) NOT NULL DEFAULT '' COMMENT '手机号',
  \`is_delete\` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否删除(1 => 是, 0 => 否)',
  \`create_time\` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库创建时间',
  \`update_time\` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_ucid\` (\`ucid\`),
  UNIQUE KEY \`uniq_account\` (\`account\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';
`;

TABLE_TEMPLATE[SINGLE_T_O_PROJECT] = `(
  \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '项目id',
  \`display_name\` varchar(50) NOT NULL DEFAULT '' COMMENT '项目名称',
  \`project_name\` varchar(50) NOT NULL DEFAULT '' COMMENT '项目代号(替代项目id, 方便debug)',
  \`c_desc\` varchar(100) NOT NULL DEFAULT '' COMMENT '备注信息',
  \`rate\` int(10) NOT NULL DEFAULT '10000' COMMENT '数据抽样比率',
  \`is_delete\` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已删除(1 => 是, 0 => 否)',
  \`create_ucid\` varchar(20) NOT NULL DEFAULT '' COMMENT '创建人ucid',
  \`update_ucid\` varchar(20) NOT NULL DEFAULT '' COMMENT '更新人ucid',
  \`create_time\` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库创建时间',
  \`update_time\` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_project_name\` (\`project_name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';`

TABLE_TEMPLATE[MULTI_T_O_MONITOR] = ``;
TABLE_TEMPLATE[MULTI_T_O_MONITOR_EXT] = ``;
TABLE_TEMPLATE[MULTI_T_O_UV_RECORD] = ``;
TABLE_TEMPLATE[MULTI_T_R_CITY_DISTRIBUTION] = ``;
TABLE_TEMPLATE[MULTI_T_R_PERFORMANCE] = ``;
TABLE_TEMPLATE[MULTI_T_O_SYSTEM_COLLECTION] = ``;
TABLE_TEMPLATE[MULTI_T_O_USER_FIRST_LOGIN_AT] = ``;
TABLE_TEMPLATE[MULTI_T_R_ERROR_SUMMARY] = ``;

export {
    // 所有表的模板
    TABLE_TEMPLATE,
    // 单表List
    SINGLE_TABLE_ARRAY,
    SINGLE_T_O_USER,

    // 多表List
    MULTI_TABLE_ARRAY
}