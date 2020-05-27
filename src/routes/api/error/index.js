import moment from 'moment';
import _ from 'lodash';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import API_RES from '~/src/constants/api_res';
import DATE_FORMAT from '~/src/constants/date_format';

const MAX_URL = 10;

function parseQueryParam(request) {
    let projectId = _.get(request, ['radar', 'project', 'projectId'], 0);
    let startAt = _.get(request, ['query', 'start_at'], 0);
    let endAt = _.get(request, ['query', 'end_at'], 0);
    let url = _.get(request, ['query', 'url'], '');
    let currentPage = _.get(request, ['query', 'current_page'], 1);
    let errorNameListJson = _.get(request, ['query', 'error_name_list_json'], '[]');
    let errorNameList = [];
    try {
        errorNameList = JSON.parse(errorNameListJson);
    } catch (error) {
        errorNameList = [];
    }
    // 提供默认值
    if(startAt <= 0){
        startAt = moment().subtract(7, 'day').startOf(DATE_FORMAT.UNIT.DAY).unix();
    }
    if (endAt <= 0) {
        endAt = moment().unix();
    }
    let parseResult = {
        projectId,
        startAt,
        endAt,
        url,
        currentPage,
        errorNameList
    }
    return parseResult;
}

const getUrlDistribution = RouterConfigBuilder.routerConfigBuilder('/api/error/distribution/url', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
    let parseResult = parseQueryParam(req);
    let {
        projectId,
        startAt,
        endAt,
        errorNameList
    } = parseResult;
    let countType = DATE_FORMAT.UNIT.DAY;

    let rawDistributionList = await MErrorSummary.getUrlPathDistributionListByErrorNameList(projectId, startAt, endAt, errorNameList, countType, MAX_URL);

    let distributionList = [];
    for(let rawDistribution of rawDistributionList){
        let {url_path: url, error_count: errorCount } = rawDistribution;
        let record = {
            name: url,
            value: errorCount
        }
        distributionList.push(record);
    }
    res.send(API_RES.showResult(distributionList));
})