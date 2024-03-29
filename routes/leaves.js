const router = require('koa-router')()
const util = require('../utils/util')
const Leave = require('../models/leaveSchema')
const Dept = require('../models/deptSchema')


// 路由前缀
router.prefix('/leave')

// 查询申请列表
router.get('/list', async (ctx) => {
    const { applyState, type } = ctx.request.query;
    const { page, skipIndex } = util.pager(ctx.request.query);
    let authorization = ctx.request.headers.authorization
    let { data } = util.decoded(authorization);
    try {
        let params = {}
        // 待我审批模块 -> 审核人去查询
        if (type == 'approve') {
            // 状态1 是待审核 当前审批人是我
            if (applyState == 1 || applyState == 2) {
                params.curAuditUserName = data.userName;
                params.$or = [{ applyState: 1 }, { applyState: 2 }];
            } else if (applyState > 2) {
                // 状态2 审批中 是审批流中有我即可 
                // 子文档查询
                params = { "audioFlows.userId": data.userId, applyState };
            } else {
                // 查询所有
                params = { "audioFlows.userId": data.userId };
            }
        } else {
            // 子文档查询
            params = {
                "applyUser.userId": data.userId
            };
            if (applyState) params.applyState = applyState;
        }

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
                userId: item.userId, userName: item.userName, userEmail: item.userEmail
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
// 审核 通过-拒绝
router.post("/approve", async (ctx) => {
    const { action, remark, _id } = ctx.request.body;
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    let params = {}
    try {
        // 1 待审批 2 审批中 3 审批拒绝 4 审批通过 5 作废
        let doc = await Leave.findById(_id);
        let auditLogs = doc.auditLogs || [];
        if (action == 'refuse') {
            // 审核驳回
            params.applyState = 3;
        } else {
            // 审核通过 
            // 审批流 和 日志 长度应该一致
            if (doc.auditFlows.length == doc.auditLogs.length) {
                ctx.body = util.success('当前申请单已处理,请勿重复提交');
                return;
            } else if (doc.auditFlows.length == doc.auditLogs.length + 1) {
                params.applyState = 4;
            } else if (doc.auditFlows.length > doc.auditLogs.length) {
                // 审核状态
                params.applyState = 2;
                // 当前审核人名字更新成下一个
                params.curAuditUserName = doc.auditFlows[doc.auditLogs.length + 1].userName;
            }
        }
        // 添加日志
        auditLogs.push({
            userId: data.userId,
            userName: data.userName,
            createTime: new Date(),
            remark,
            action: action == 'refuse' ? '审核拒绝' : '审核通过'
        })
        params.auditLogs = auditLogs;
        let res = await Leave.findByIdAndUpdate(_id, params);
        ctx.body = util.success("", "处理成功");
    } catch (error) {
        ctx.body = util.fail(`查询异常:${error.message}`)
    }
})

// 获取右上角通知数
router.get("/count", async (ctx) => {
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    try {
        let params = {};
        params.curAuditUserName = data.userName;
        params.$or = [{ applyState: 1 }, { applyState: 2 }];
        const total = await Leave.countDocuments(params);
        ctx.body = util.success(total);
    } catch (error) {
        ctx.body = util.fail(`查询异常:${error.message}`);
    }
})
module.exports = router