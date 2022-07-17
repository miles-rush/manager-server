/**
 * 通用工具函数
 */
const jwt = require('jsonwebtoken')
const log4js = require('./log4j')

const CODE = {
    SUCCESS: 200,
    PARAM_ERROR: 10001, // 参数错误
    USER_ACCOUNT_ERROR: 20001, // 账号或密码错误
    USER_LOGIN_ERROR: 30001, // 用户未登录
    BUSINESS_ERROR: 40001, // 业务请求失败
    AUTH_ERROR: 50001, // 认证失败或TOKEN过期
}

module.exports = {
    /**
     * 分页结构封装
     * @param {} param0 
     * @returns 
     */
    pager({ pageNum = 1, pageSize = 10 }) {
        pageNum *= 1;
        pageSize *= 1;
        const skipIndex = (pageNum - 1) * pageSize;
        return {
            page: {
                pageNum,
                pageSize
            },
            skipIndex
        }
    },
    success(data = '', msg = '', code = CODE.SUCCESS) {
        log4js.debug(data);
        return {
            code, data, msg
        }
    },
    fail(msg = '', code = CODE.BUSINESS_ERROR, data = '') {
        log4js.debug(msg);
        return {
            code, data, msg
        }
    },
    CODE,
    decoded(authorization) {
        if (authorization) {
            let token = authorization.split(' ')[1];
            return jwt.verify(token, 'miles-rush');
        }
        return '';
    },
    // 递归拼接树形结构
    getTreeMenu(rootList, id, list) {
        // rootList - 存放了所有数据
        for (let i = 0; i < rootList.length; i++) {
            // 取每条数据
            let item = rootList[i];
            // parentId - array
            if (String(item.parentId.slice().pop()) == String(id)) {
                // console.log(item);
                // 这里不能直接用item 要用_doc取文档
                list.push(item._doc);
            }
        }
        list.map(item => {
            item.children = [];
            // 因为子数据的parentId中存放了父菜单的id 所以用id继续递归搜索
            // 将函数迁移到util后要用this去调用
            this.getTreeMenu(rootList, item._id, item.children);
            if (item.children.length == 0) {
                delete item.children;
            } else if (item.children.length > 0 && item.children[0].menuType == 2) {
                // 对菜单和按钮进行区分
                item.action = item.children;
            }
        });
        return list;
    },
    // 格式化时间
    formateDate(date, rule) {
        let fmt = rule || 'yyyy-MM-dd hh:mm:ss'
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, date.getFullYear())
        }
        const o = {
            // 'y+': date.getFullYear(),
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds()
        }
        for (let k in o) {
            if (new RegExp(`(${k})`).test(fmt)) {
                const val = o[k] + '';
                fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? val : ('00' + val).substr(val.length));
            }
        }
        return fmt;
    },
}