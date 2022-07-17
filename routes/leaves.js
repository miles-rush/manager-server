const router = require('koa-router')()
const util = require('../utils/util')
const Leave = require('../models/leaveSchema')
const Dept = require('../models/deptSchema')


// 路由前缀
router.prefix('/leave')

// 查询申请列表
router.get('/list', async (ctx) => {
    const { applyState } = ctx.request.query;
    const { page, skipIndex } = util.pager(ctx.request.query);
    let authorization = ctx.request.headers.authorization
    let { data } = util.decoded(authorization);
    try {
        // 子文档查询
        let params = {
            "applyUser.userId": data.userId
        };
        if (applyState) params.applyState = applyState;
        // 这里不能使用await调用 使用await会直接返回数据 因为后续要分页 所以这里不使用await
        const query = Leave.find(params);
        // 做分页 在这里query是一个promise对象
        const list = await query.skip(skipIndex).limit(page.pageSize);
        // 总数
        const total = await Leave.countDocuments(params);
        // 返回数据
        ctx.body = util.success({
            page: {
                ...page,
                total
            },
            list
        })
    } catch (error) {
        ctx.body = util.fail(`查询失败:${error.stack}`);
    }
})


// 创建申请
router.post("/operate", async (ctx) => {
    const { _id, action, ...params } = ctx.request.body;
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    if (action == 'create') {
        // 生成申请单号
        let orderNo = "XJ";
        orderNo += util.formateDate(new Date(), "yyyyMMdd");
        const total = await Leave.countDocuments();
        params.orderNo = orderNo + total;
        // 获取用户上级部门负责人信息
        let id = data.deptId.pop();
        // 查找负责人信息
        let dept = await Dept.findById(id);
        // 获取人事部门和财务部门负责人信息
        let userList = await Dept.find({ deptName: { $in: ['人事部门', '财务部门'] } })
        let auditUsers = dept.userName;
        let curAuditUserName = dept.userName;
        let auditFlows = [
            { userId: dept.userId, userName: dept.userName, userEmail: dept.userEmail },
        ]
        userList.map(item => {
            auditFlows.push({
                userId: dept.userId, userName: dept.userName, userEmail: dept.userEmail
            })
            auditUsers += ',' + item.userName;
        })

        params.auditUsers = auditUsers;
        params.curAuditUserName = dept.userName;
        params.auditFlows = auditFlows;
        params.auditLogs = [];
        params.applyUser = {
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail
        }
        let res = await Leave.create(params);
        ctx.body = util.success('', '创建成功');
    } else {
        let res = await Leave.findByIdAndUpdate(_id, { applyState: 5 });
        ctx.body = util.success('', '操作成功');
    }

})

module.exports = router