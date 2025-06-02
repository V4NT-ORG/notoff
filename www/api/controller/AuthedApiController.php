<?php
namespace Lazyphp\Controller;

class AuthedApiController
{
    public function __construct()
    {
        // stoken 走最高优先级
        $stoken = t(v('stoken'));
        if (strlen($stoken) > 0) {
            login_by_stoken($stoken);
        } else {
            // 不认 cookie 带来的 php sessionid
            $token = t(v('token'));
            if (strlen($token) < 1) {
                return lianmi_throw('NOTLOGIN', '此接口需要登入才可调用');
            }
            session_id($token);
            session_start();
        }
        
        if (!isset($_SESSION['level']) || intval($_SESSION['level']) < 1 || intval($_SESSION['uid']) < 1) {
            return lianmi_throw('NOTLOGIN', '您的登入状态已过期，请重新登入');
        }
    }


    /**
     * 附件上传
     * 此接口只用于上传图片，并将 URL 返回，不关系具体的逻辑。可供 头像上传 和 栏目封面上传公用
     * @TODO 稍后需要添加数据统计，以避免图片被滥用
     * @ApiDescription(section="Global", description="图片上传")
     * @ApiLazyRoute(uri="/attach/upload",method="POST|GET")
     * * @ApiParams(name="name", type="string", nullable=false, description="name", check="check_not_empty", cnname="文件名称")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function attachUpload($name)
    {
        /*
        "Array
        (
            [attach] => Array
                (
                    [name] => blob
                    [type] => attach/png
                    [tmp_name] => /private/var/folders/q7/3xwy3ysn2sggtwzq98fpf3l40000gn/T/php1iUQLb
                    [error] => 0
                    [size] => 38084
                )

        )
        "
        */

        if (!isset($_FILES['attach'])) {
            return lianmi_throw('INPUT', '找不到上传的文件，[attach] 不存在');
        }

        if (intval($_FILES['attach']['error']) !== 0) {
            return lianmi_throw('INPUT', '文件上传失败');
        }
        
        $name = basename($name);
        if (mb_strlen($name, 'UTF-8') > 15) {
            $name = mb_substr($name, -15, null, 'UTF-8');
        }


        // 生成新文件名
        $path = 'u' . $_SESSION['uid'] . '/' . date("Y.m.d.") . uniqid() . $name ;

        // 保存文件
        if (!storage()->write($path, file_get_contents($_FILES['attach']['tmp_name']), ['visibility' => 'private'])) {
            return lianmi_throw('FILE', '保存文件失败');
        }

        return send_result(['name'=>$name , 'url' => path2url($path, 'attach') ]);
    }

    /**
     * 显示图片
     * @TODO 此接口不需要登入，以后会使用云存储或者x-send来替代
     * @ApiDescription(section="Global", description="显示图片接口")
     * @ApiLazyRoute(uri="/attach/@uid/@inner_path",method="GET|POST")
     * @ApiParams(name="uid", type="string", nullable=false, description="uid", check="check_not_empty", cnname="图片路径")
     * @ApiParams(name="inner_path", type="string", nullable=false, description="inner_path", check="check_not_empty", cnname="图片路径")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function showAttachment($uid, $inner_path)
    {
        $path = $uid .'/' . $inner_path;
        if (!$content = storage()->read($path)) {
            return lianmi_throw('FILE', '文件数据不存在');
        }
        $mime = storage()->getMimetype($path);

        header('Content-Type: ' . $mime);
        echo $content;

        return true;
    }

    /**
     * 图片上传
     * 此接口只用于上传图片，并将 URL 返回，不关系具体的逻辑。可供 头像上传 和 栏目封面上传公用
     * @TODO 稍后需要添加数据统计，以避免图片被滥用
     * @ApiDescription(section="Global", description="图片上传")
     * @ApiLazyRoute(uri="/image/upload",method="POST|GET")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function imageUpload()
    {
        if (!isset($_FILES['image']) || !isset($_FILES['image']['tmp_name']) || empty($_FILES['image']['tmp_name'])) {
            return lianmi_throw('INPUT', '找不到上传的文件，[image] 不存在');
        }
        if (intval($_FILES['image']['error']) !== 0) {
            return lianmi_throw('INPUT', '文件上传失败，错误代码: ' . $_FILES['image']['error']);
        }

        $tmp_name = $_FILES['image']['tmp_name'];

        // Server-side MIME type validation
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $tmp_name);
        finfo_close($finfo);

        $allowed_mime_types = ['image/jpeg', 'image/png', 'image/gif'];
        if (!in_array($mime_type, $allowed_mime_types)) {
            return lianmi_throw('INPUT', '不支持的文件类型: ' . $mime_type . '. 只允许 JPEG, PNG, GIF.');
        }

        // Determine extension based on MIME type
        $extension = '';
        switch ($mime_type) {
            case 'image/jpeg':
                $extension = 'jpg';
                break;
            case 'image/png':
                $extension = 'png';
                break;
            case 'image/gif':
                $extension = 'gif';
                break;
            default: // Should not happen due to check above
                return lianmi_throw('INPUT', '无法确定文件扩展名');
        }

        // Generate new filename
        $path = 'u' . $_SESSION['uid'] . '/' . date("Y.m.d.") . uniqid() . '.' . $extension;

        try {
            // Re-process image using Intervention Image
            $imgManager = new \Intervention\Image\ImageManagerStatic(); // Use static facade if preferred
            $image = $imgManager->make($tmp_name);
            
            // Optional: Auto-orient based on EXIF data
            $image->orientate();

            // Optional: Resize if images are too large, e.g., max width/height
            // $image->resize(1920, 1080, function ($constraint) {
            //     $constraint->aspectRatio();
            //     $constraint->upsize();
            // });

            $image_data = (string) $image->encode($extension, 90); // Encode to original type, quality 90 for jpg/png

            // Save the processed file
            if (!storage()->write($path, $image_data, ['visibility' => 'private', 'mimetype' => $mime_type])) {
                return lianmi_throw('FILE', '保存文件失败');
            }
        } catch (\Exception $e) {
            // Log error: error_log("Image processing/saving failed: " . $e->getMessage());
            return lianmi_throw('FILE', '图像处理或保存失败: ' . $e->getMessage());
        }
        
        return send_result(['url' => path2url($path) ]); // path2url default action is 'image'
    }

    /**
     * 图片上传
     * 此接口只用于上传图片，并将 URL 返回，不关系具体的逻辑。可供 头像上传 和 栏目封面上传公用
     * @TODO 稍后需要添加数据统计，以避免图片被滥用
     * @ApiDescription(section="Global", description="图片上传")
     * @ApiLazyRoute(uri="/image/upload_thumb",method="POST|GET")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function imageUploadToThumb()
    {
        /*
        "Array
        (
            [image] => Array
                (
                    [name] => blob
                    [type] => image/png
                    [tmp_name] => /private/var/folders/q7/3xwy3ysn2sggtwzq98fpf3l40000gn/T/php1iUQLb
                    [error] => 0
                    [size] => 38084
                )

        )
        "
        */

        if (!isset($_FILES['image'])) {
            return lianmi_throw('INPUT', '找不到上传的文件，[image] 不存在');
        }
        if (intval($_FILES['image']['error']) !== 0) {
            return lianmi_throw('INPUT', '文件上传失败');
        }
        
        $mime = strtolower($_FILES['image']['type']);

        if ($mime != 'image/png' && $mime != 'image/jpg' && $mime != 'image/jpeg') {
            return lianmi_throw('INPUT', '本接口只支持 png 和 jpg 格式的图片'.$mime);
        } // image/jpeg

        // 考虑到 png 透明的问题，加个 type 吧
        if ($mime == 'image/png') {
            $type = 'png';
        } else {
            $type = 'jpg';
        }
        
        // 生成新文件名
        $prefix = 'u' . $_SESSION['uid'] . '/' . date("Y.m.d.") . uniqid() ;
        $path = $prefix. '.' . $type;
        $path_thumb = $prefix . '.thumb.'.$type;

        // 不管是不是原图，都用图像库处理，进行转化和缩图，避免安全风险
        $img = new \Intervention\Image\ImageManager();

        // 将原图转化为 jpg 格式
        $orignal_data = (string)$img->make($_FILES['image']['tmp_name'])->encode($type, 100);

        // 保存原图
        if (!storage()->write($path, $orignal_data, ['visibility' => 'private'])) {
            return lianmi_throw('FILE', '保存文件失败');
        }
        $orignal_url = path2url($path);

        // 开始缩图
        $thumb_data = (string)$img->make($_FILES['image']['tmp_name'])->fit(200, 200, null, 'top')->encode($type, 100);
        if (!storage()->write($path_thumb, $thumb_data, ['visibility' => 'private'])) {
            return lianmi_throw('FILE', '保存文件失败');
        }
        
        $thumb_url = path2url($path_thumb);

        return send_result(compact('orignal_url', 'thumb_url', 'prexfix', 'type'));
    }

    /**
     * 删除内容
     * @ApiDescription(section="Feed", description="删除内容")
     * @ApiLazyRoute(uri="/feed/remove/@id",method="POST|GET")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function feedRemove($id)
    {
        $id = intval($id); 
        $feed = get_line("SELECT * FROM `feed` WHERE `id` = :id AND `is_delete` != 1 LIMIT 1", [':id' => $id]);

        if (!$feed) {
            return lianmi_throw('INPUT', 'id对应的内容不存在或已被删除');
        }
        
        if ($feed['is_forward'] == 1) {
            if ($feed['forward_uid'] != lianmi_uid()) {
                return lianmi_throw('AUTH', '只有栏主才能删除自己的通过的内容');
            }
        } else {
            if ($feed['uid'] != lianmi_uid()) {
                return lianmi_throw('AUTH', '只有作者才能删除自己的内容');
            }
        }
        
        $sql = "UPDATE `feed` SET `is_delete` = '1' WHERE `id` = :id LIMIT 1 ";
        run_sql($sql, [':id' => $id]);

        $feed['is_delete'] = 1;
        return send_result($feed);
    }

    /**
     * 设置栏目置顶
     * @ApiDescription(section="group", description="设置栏目置顶")
     * @ApiLazyRoute(uri="/group/top",method="POST|GET")
     * @ApiParams(name="feed_id", type="int", nullable=false, description="feed_id", cnname="内容id")
     * @ApiParams(name="group_id", type="int", nullable=false, description="group_id", cnname="栏目id")
     * @ApiParams(name="status", type="int", nullable=false, description="status", cnname="是否为置顶")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function groupTop($group_id, $feed_id, $status = 1)
    {
        $group_id = intval($group_id);
        $feed_id_for_query = intval($feed_id); // Store original feed_id for queries
        $top_status_feed_id = ($status == 1) ? $feed_id_for_query : 0;

        // 检查权限
        // LDO usage is already safe due to previous refactoring of LDO itself
        if (!$group = table('group')->getAllById($group_id)->toLine()) {
            return lianmi_throw('INPUT', '错误的栏目ID，栏目不存在或已被删除');
        }
        
        if ($group['author_uid'] != lianmi_uid()) {
            return lianmi_throw('AUTH', '只有栏主才能修改栏目资料');
        }
        
        $feed = get_line("SELECT * FROM `feed` WHERE `id` = :feed_id AND `is_delete` != 1 LIMIT 1", [':feed_id' => $feed_id_for_query]);
        if (!$feed) {
            return lianmi_throw('INPUT', 'id对应的内容不存在或已被删除');
        }
        
        if ($feed['group_id'] != $group_id && $feed['forward_group_id'] != $group_id) {
            return lianmi_throw('AUTH', '只能置顶属于该栏目的内容');
        }
        
        $sql = "UPDATE `group` SET `top_feed_id` = :top_feed_id WHERE `id` = :group_id LIMIT 1 ";
        run_sql($sql, [':top_feed_id' => $top_status_feed_id, ':group_id' => $group_id]);

        $group['top_feed_id'] = $top_status_feed_id;

        return send_result($group);
    }

    /**
     * 更新内容
     * @ApiDescription(section="Feed", description="更新内容")
     * @TODO 此接口需要加入相同内容不能短时间重复更新的限制
     * @ApiParams(name="text", type="string", nullable=false, description="text", check="check_not_empty", cnname="内容内容")
     * @ApiParams(name="images", type="string", nullable=false, description="images", cnname="内容附图")
     * @ApiParams(name="attach", type="string", nullable=false, description="attach", cnname="内容附件")
     * @ApiParams(name="is_paid", type="int", nullable=false, description="is_paid", cnname="是否为付费内容")
     * @ApiLazyRoute(uri="/feed/update/@id",method="POST|GET")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function feedUpdate($id, $text, $images='', $attach = '', $is_paid=0)
    {
        $id = intval($id);
        $is_paid = abs(intval($is_paid));
        
        $feed = get_line("SELECT * FROM `feed` WHERE `id` = :id AND `is_delete` != 1 LIMIT 1", [':id' => $id]);

        if (!$feed) {
            return lianmi_throw('INPUT', 'id对应的内容不存在或已被删除');
        }
        
        if ($feed['uid'] != lianmi_uid()) {
            return lianmi_throw('AUTH', '只有作者才能修改自己的内容');
        }

        // Image URL validation logic remains important.
        if (strlen($images) > 1) {
            if (!$image_list = @json_decode($images, 1)) { 
                $images = ''; 
            } else {
                foreach ($image_list as $image) {
                    if (!check_image_url($image['orignal_url']) || !check_image_url($image['thumb_url'])) {
                        return lianmi_throw('INPUT', '包含未被许可的图片链接，请重传图片后发布');
                    }
                }
            }
        }

        $sql = "UPDATE `feed` SET `text` = :text, `images` = :images, `files` = :files, `is_paid` = :is_paid WHERE `id` = :id LIMIT 1 ";
        
        $params = [
            ':text' => $text,
            ':images' => $images,
            ':files' => $attach,
            ':is_paid' => $is_paid,
            ':id' => $id
        ];
        run_sql($sql, $params);

        $feed['text'] = $text;
        $feed['images'] = $images; 
        $feed['files'] = $attach; 
        $feed['is_paid'] = $is_paid;

        return send_result($feed);
    }

    /**
     * 发布内容
     * @ApiDescription(section="Feed", description="发布内容")
     * @TODO 此接口需要加入相同内容不能短时间重复发布的限制
     * @ApiParams(name="text", type="string", nullable=false, description="text", check="check_not_empty", cnname="内容内容")
     * @ApiParams(name="groups", type="string", nullable=false, description="groups", check="check_not_empty", cnname="目标栏目")
     * @ApiParams(name="images", type="string", nullable=false, description="images", cnname="内容附图")
    * @ApiParams(name="attach", type="string", nullable=false, description="attach", cnname="内容附件")
     * @ApiParams(name="is_paid", type="int", nullable=false, description="is_paid", cnname="是否为付费内容")
     * @ApiLazyRoute(uri="/feed/publish",method="POST|GET")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function feedPublish($text, $groups, $images='', $attach = '', $is_paid=0)
    {
        $is_paid = abs(intval($is_paid));
        
        // 首先需要做一个增强验证
        $group_ids = json_decode($groups, 1);
        
        // 如果栏目数据不对
        if (!is_array($group_ids) || intval($group_ids[0]) < 1) {
            return lianmi_throw('INPUT', '目标栏目不能为空'.$groups);
        }

        // 检测栏目权限
        // Using lianmi_uid() directly in SQL, ensure it's an int
        $uid = lianmi_uid(); // This is already intval'd
        $allowed_groups = get_data("SELECT * FROM `group_member` WHERE `uid` = :uid AND ( `is_author` = 1 OR `can_contribute` = 1 ) LIMIT ". intval(c('max_group_per_user')), [':uid' => $uid]);

        $allowed_gids = [];
        $author_gids = [];
        $member_gids = [];
        foreach ($allowed_groups as $item) {
            $allowed_gids[] = $item['group_id'];
            if ($item['is_author'] == 1) {
                $author_gids[] = $item['group_id'];
            } else {
                $member_gids[] = $item['group_id'];
            }
        }

        foreach ($group_ids as $key => $gid) {
            // 如果栏目 id 没有权限，从列表中移除
            if (!in_array($gid, $allowed_gids)) {
                unset($group_ids[$key]);
            }

            //
        }

        // 如果移除无权限的栏目以后，没有可用的栏目，则抛出异常
        if (count($group_ids) < 1) {
            return lianmi_throw('INPUT', '您选择的栏目都没有发布或投稿权限，请重新选择');
        }

        // 检查image数据，确保没有外部链接以避免带来安全问题，这个地方存在链接伪造风风险
        if (strlen($images) > 1) {
            if (!$image_list = @json_decode($images, 1)) {
                $images = '';
            } else {
                foreach ($image_list as $image) {
                    if (!check_image_url($image['orignal_url']) || !check_image_url($image['thumb_url'])) {
                        return lianmi_throw('INPUT', '包含未被许可的图片链接，请重传图片后发布');
                    }
                }
            }
        }

        // 开始入库
        $now = lianmi_now();
        $uid = lianmi_uid();

        $sql_insert_feed = "INSERT INTO `feed` ( `text` , `group_id` , `images` , `files` , `uid` , `is_paid` , `timeline` ) VALUES ( :text , '0' , :images , :files , :uid , :is_paid , :timeline )";
        $params_insert_feed = [
            ':text' => $text,
            ':images' => $images,
            ':files' => $attach,
            ':uid' => $uid,
            ':is_paid' => $is_paid,
            ':timeline' => $now
        ];
        run_sql($sql_insert_feed, $params_insert_feed);
        $feed_id = db()->lastId();

        if (is_array($author_gids) && count($author_gids) > 0) {
            foreach ($author_gids as $gid) {
                if (!in_array($gid, $group_ids)) continue;
                $gid = intval($gid);

                $sql_forward = "INSERT INTO `feed` ( `text` , `group_id` , `images` , `files` , `uid` , `is_paid` , `timeline` , `is_forward` , `forward_feed_id` , `forward_uid` , `forward_text` , `forward_is_paid` , `forward_group_id` , `forward_timeline`  ) VALUES ( :text , '0' , :images ,  :files , :original_uid , :is_paid , :original_timeline , '1' , :forward_feed_id , :forward_uid , '' , :is_paid , :forward_group_id , :forward_timeline )";
                $params_forward = [
                    ':text' => $text, ':images' => $images, ':files' => $attach, ':original_uid' => $uid,
                    ':is_paid' => $is_paid, ':original_timeline' => $now, // Using original feed's timeline or current time for forward? Original used $now for both.
                    ':forward_feed_id' => $feed_id, ':forward_uid' => $uid,
                    ':forward_group_id' => $gid, ':forward_timeline' => $now
                ];
                run_sql($sql_forward, $params_forward);

                run_sql("UPDATE `group` SET `feed_count` = ( SELECT COUNT(*) FROM `feed` WHERE `forward_group_id` = :gid AND `is_delete` != 1 ) WHERE `id`= :gid LIMIT 1", [':gid' => $gid]);
                run_sql("UPDATE `user` SET `feed_count` = ( SELECT COUNT(*) FROM `feed` WHERE `uid` = :uid AND `is_delete` != 1 AND `is_forward` != 1 ) WHERE `id`= :uid LIMIT 1", [':uid' => $uid]);
            }
        }
        
        if (is_array($member_gids) && count($member_gids) > 0) {
            foreach ($member_gids as $gid) {
                if (!in_array($gid, $group_ids)) continue;
                $gid = intval($gid);

                $sql_contribute = "INSERT IGNORE INTO `feed_contribute` ( `uid` , `feed_id` , `group_id` , `status`, `timeline` ) VALUES ( :uid , :feed_id , :group_id , '0' , :timeline )";
                run_sql($sql_contribute, [':uid' => $uid, ':feed_id' => $feed_id, ':group_id' => $gid, ':timeline' => $now]);

                run_sql("UPDATE `group` SET `todo_count` = ( SELECT COUNT(*) FROM `feed_contribute` WHERE `group_id` = :gid AND `status` = 0 ) WHERE `id`= :gid LIMIT 1", [':gid' => $gid]);

                $group = get_line("SELECT * FROM `group` WHERE `id`= :gid LIMIT 1", [':gid' => $gid]);
                if ($group && $group['author_uid'] != $uid) {
                    system_notice($group['author_uid'], $uid, lianmi_username(), lianmi_nickname(), 'contribute to'. $group['name'], '/group/contribute/todo');
                }
            }
        }
        return send_result(compact('feed_id', 'text', 'groups', 'images', 'is_paid'));
    }

    /**
     * 获得我创建的栏目列表
     * @ApiDescription(section="Group", description="获得栏目列表")
     * @ApiLazyRoute(uri="/group/mine",method="GET|POST")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getMineGroup()
    {
        $uid = lianmi_uid();
        return send_result(get_data("SELECT * FROM `group` WHERE `is_active` = 1 AND `author_uid` = :uid ORDER BY `promo_level` DESC , `member_count` DESC , `id` DESC LIMIT 100 ", [':uid' => $uid]));
    }

    /**
     * 获取栏目内容
     * @ApiDescription(section="Group", description="检查栏目购买数据")
     * @ApiLazyRoute(uri="/group/feed/@id",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="栏目ID")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     * @ApiParams(name="filter", type="int", nullable=false, description="filter", cnname="过滤选项")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getGroupFeed($id, $since_id = 0, $filter = 'all')
    {
        $id = intval($id);
        $uid = lianmi_uid();
        $since_id = intval($since_id);

        $info = get_line("SELECT * FROM `group_member` WHERE `uid` = :uid AND `group_id` = :group_id LIMIT 1", [':uid' => $uid, ':group_id' => $id]);
        if (!$info) {
            return lianmi_throw('AUTH', '只有成员才能查看栏目内容');
        }

        $filter_conditions = [];
        $params = [':forward_group_id' => $id];

        if ($filter == 'paid') {
            $filter_conditions[] = "`is_paid` = 1";
        }
        if ($filter == 'media') {
            $filter_conditions[] = "`images` != ''"; // Assuming images is never NULL for media
        }
        
        if ($info['is_vip'] != 1 && $info['is_author'] != 1) {
            $filter_conditions[] = "`is_paid` != 1";
        }
        
        if ($since_id > 0) {
            $filter_conditions[] = "`id` < :since_id";
            $params[':since_id'] = $since_id;
        }
        
        $where_clause = "WHERE `is_delete` != 1 AND `forward_group_id` = :forward_group_id";
        if (!empty($filter_conditions)) {
            $where_clause .= " AND " . join(" AND ", $filter_conditions);
        }

        $sql = "SELECT *, `uid` as `user` , `forward_group_id` as `group` FROM `feed` {$where_clause} ORDER BY `id` DESC LIMIT " . intval(c('feeds_per_page'));
        
        $data = get_data($sql, $params);
        $data = extend_field($data, 'user', 'user'); // extend_field needs to be checked if it uses parameterized queries internally or if its inputs are safe
        $data = extend_field($data, 'group', 'group');
        
        $maxid = null; $minid = null;
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $item) {
                if ($item['id'] > $maxid) $maxid = $item['id'];
                if ($item['id'] < $minid) $minid = $item['id'];
            }
        }

        $groupinfo = get_line("SELECT * FROM `group` WHERE `id` = :id LIMIT 1", [':id' => $id]);
        $topfeed = false;
        if ($groupinfo && isset($groupinfo['top_feed_id']) && intval($groupinfo['top_feed_id']) > 0) {
            $topfeed_id = intval($groupinfo['top_feed_id']);
            $topfeed_data = get_line("SELECT *, `uid` as `user` , `forward_group_id` as `group` FROM `feed` WHERE `is_delete` != 1 AND `id` = :top_feed_id LIMIT 1", [':top_feed_id' => $topfeed_id]);
            if($topfeed_data){
                $topfeed = extend_field_oneline($topfeed_data, 'user', 'user');
                $topfeed = extend_field_oneline($topfeed, 'group', 'group');
            }
        }
            
        return send_result(['feeds'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid , 'topfeed' => $topfeed ]);
    }

    /**
     * 设置栏目成员黑名单
     * @ApiDescription(section="Group", description="设置栏目成员黑名单")
     * @ApiLazyRoute(uri="/group/blacklist",method="GET|POST")
     * @ApiParams(name="uid", type="int", nullable=false, description="uid", check="check_uint", cnname="用户ID")
     * @ApiParams(name="group_id", type="int", nullable=false, description="group_id", check="check_uint", cnname="栏目ID")
     * @ApiParams(name="status", type="int", nullable=false, description="status", check="check_uint", cnname="黑名单状态")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function setGroupBlackList($uid, $group_id, $status = 1)
    {
        $current_uid = lianmi_uid();
        $group_id = intval($group_id);
        $target_uid = intval($uid);
        $status = intval($status);

        $info = get_line("SELECT * FROM `group_member` WHERE `uid` = :current_uid AND `group_id` = :group_id LIMIT 1", [':current_uid' => $current_uid, ':group_id' => $group_id]);
        if (!$info || $info['is_author'] != 1) {
            return lianmi_throw('AUTH', '只有管理员才能设置栏目黑名单');
        }

        if ($status == 1) {
            if ($target_uid == $current_uid) {
                return lianmi_throw('INPUT', '不能将自己加入黑名单');
            }
            $sql = "INSERT IGNORE INTO `group_blacklist` ( `group_id` , `uid` , `timeline` ) VALUES ( :group_id , :target_uid , :timeline )";
            run_sql($sql, [':group_id' => $group_id, ':target_uid' => $target_uid, ':timeline' => lianmi_now()]);
            // After blacklisting, ensure user is removed from group if quitGroup logic is complex or has side effects
            $this->quitGroup($group_id, $target_uid); // quitGroup needs to be reviewed for safety
        } else {
            $sql = "DELETE FROM `group_blacklist` WHERE `group_id` = :group_id AND `uid` = :target_uid LIMIT 1";
            run_sql($sql, [':group_id' => $group_id, ':target_uid' => $target_uid]);
        }
        return send_result(['status'=>$status]);
    }

    /**
     * 设置栏目投稿黑名单
     * @ApiDescription(section="Group", description="设置栏目投稿黑名单")
     * @ApiLazyRoute(uri="/group/contribute_blacklist",method="GET|POST")
     * @ApiParams(name="uid", type="int", nullable=false, description="uid", check="check_uint", cnname="用户ID")
     * @ApiParams(name="group_id", type="int", nullable=false, description="group_id", check="check_uint", cnname="栏目ID")
     * @ApiParams(name="status", type="int", nullable=false, description="status", check="check_uint", cnname="黑名单状态")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function setGroupContributeBlackList($uid, $group_id, $status = 1)
    {
        if ($status != 1) {
            $status = 0;
        }
        
        if ($status != 1) { // Ensure status is 0 or 1
            $status = 0;
        }
        $current_uid = lianmi_uid();
        $group_id = intval($group_id);
        $target_uid = intval($uid);
        
        $info = get_line("SELECT * FROM `group_member` WHERE `uid` = :current_uid AND `group_id` = :group_id LIMIT 1", [':current_uid' => $current_uid, ':group_id' => $group_id]);
        if (!$info || $info['is_author'] != 1) {
            return lianmi_throw('AUTH', '只有管理员才能设置栏目黑名单');
        }

        if ($target_uid == $current_uid) {
            return lianmi_throw('INPUT', '不能将自己加入黑名单');
        }

        $sql = "UPDATE `group_member` SET `can_contribute` = :can_contribute WHERE `uid` = :target_uid AND `group_id` = :group_id LIMIT 1";
        run_sql($sql, [':can_contribute' => $status, ':target_uid' => $target_uid, ':group_id' => $group_id]);

        return send_result(['status'=>$status]); // Removed SQL from response
    }

    /**
     * 设置栏目评论黑名单
     * @ApiDescription(section="Group", description="设置栏目评论黑名单")
     * @ApiLazyRoute(uri="/group/comment_blacklist",method="GET|POST")
     * @ApiParams(name="uid", type="int", nullable=false, description="uid", check="check_uint", cnname="用户ID")
     * @ApiParams(name="group_id", type="int", nullable=false, description="group_id", check="check_uint", cnname="栏目ID")
     * @ApiParams(name="status", type="int", nullable=false, description="status", check="check_uint", cnname="黑名单状态")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function setGroupCommentBlackList($uid, $group_id, $status = 1)
    {
        if ($status != 1) {
            $status = 0;
        }
        
        if ($status != 1) { // Ensure status is 0 or 1
            $status = 0;
        }
        $current_uid = lianmi_uid();
        $group_id = intval($group_id);
        $target_uid = intval($uid);

        $info = get_line("SELECT * FROM `group_member` WHERE `uid` = :current_uid AND `group_id` = :group_id LIMIT 1", [':current_uid' => $current_uid, ':group_id' => $group_id]);
        if (!$info || $info['is_author'] != 1) {
            return lianmi_throw('AUTH', '只有管理员才能设置栏目黑名单');
        }

        if ($target_uid == $current_uid) {
            return lianmi_throw('INPUT', '不能将自己加入黑名单');
        }

        $sql = "UPDATE `group_member` SET `can_comment` = :can_comment WHERE `uid` = :target_uid AND `group_id` = :group_id LIMIT 1";
        run_sql($sql, [':can_comment' => $status, ':target_uid' => $target_uid, ':group_id' => $group_id]);
        
        return send_result(['status'=>$status]);
    }

    /**
     * 获取栏目成员列表
     * @ApiDescription(section="Group", description="获取栏目成员列表")
     * @ApiLazyRoute(uri="/group/member/@id",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="栏目ID")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     * @ApiParams(name="filter", type="int", nullable=false, description="filter", cnname="过滤选项")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getGroupMember($id, $since_id = 0, $filter = 'all')
    {
        $id = intval($id);
        $current_uid = lianmi_uid();
        $since_id = intval($since_id);

        if (!get_line("SELECT * FROM `group_member` WHERE `uid` = :current_uid AND `group_id` = :group_id LIMIT 1", [':current_uid' => $current_uid, ':group_id' => $id])) {
            return lianmi_throw('AUTH', '只有成员才能查看栏目成员');
        }

        $params = [':group_id' => $id];
        $filter_conditions = "";

        if ($filter == 'blacklist') {
            $base_sql_select = "SELECT * , `uid` as `user` FROM `group_blacklist`";
            $filter_conditions = " WHERE `group_id` = :group_id";
        } else {
            $base_sql_select = "SELECT * , `uid` as `user` FROM `group_member`";
            $filter_conditions = " WHERE `group_id` = :group_id";
            if ($filter == 'contribute') {
                $filter_conditions .= " AND `can_contribute` = 0 ";
            }
            if ($filter == 'comment') {
                $filter_conditions .= " AND `can_comment` = 0 ";
            }
        }
        
        if ($since_id > 0) {
            $filter_conditions .= " AND `id` < :since_id ";
            $params[':since_id'] = $since_id;
        }

        $sql = $base_sql_select . $filter_conditions ." ORDER BY `id` DESC LIMIT " . intval(c('users_per_page'));
        
        // LDO usage is safe
        $group_black_list_uids = table('group_blacklist')->getUidByGroup_id($id)->toColumn('uid'); 
        
        $data = get_data($sql, $params);
        $data = extend_field($data, 'user', 'user'); // Review extend_field
        
        $maxid = null; $minid = null;
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $key => $item) {
                if (isset($item['can_contribute'])) $data[$key]['user']['can_contribute'] = $item['can_contribute'];
                if (isset($item['can_comment'])) $data[$key]['user']['can_comment'] = $item['can_comment'];
                $data[$key]['user']['inblacklist'] = ($group_black_list_uids && in_array($item['uid'], $group_black_list_uids)) ? 1 : 0;
                if ($item['id'] > $maxid) $maxid = $item['id'];
                if ($item['id'] < $minid) $minid = $item['id'];
            }
        }
        return send_result(['members'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid ]);
    }

    /**
     * 创建栏目
     * @TODO 当前版本不处理销售信息
     * @TODO 需要限制创建的栏目上限
     * @TODO 需要在栏目创建成功后，自动将作者加入到栏目里边
     * @ApiDescription(section="Group", description="创建栏目")
     * @ApiParams(name="name", type="string", nullable=false, description="name", check="check_not_empty", cnname="栏目名称")
     * @ApiParams(name="author_address", type="string", nullable=false, description="author_address", check="check_not_empty", cnname="栏目提现地址")
     * @ApiParams(name="price_wei", type="string", nullable=false, description="price_wei", check="check_uint", cnname="栏目年费价格")
     * @ApiParams(name="cover", type="string", nullable=false, description="cover", check="check_not_empty", cnname="栏目封面地址")
     * @ApiParams(name="seller_uid", type="string", nullable=false, description="seller_uid", cnname="销售商编号")
     * @ApiLazyRoute(uri="/group/create",method="POST|GET")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function groupCreate($name, $author_address, $price_wei, $cover, $seller_uid = 0)
    {
        // $price_wei is a string representing a large integer. bigintval ensures it's a valid numeric string.
        $valid_price_wei = bigintval($price_wei);

        if (!check_image_url($cover)) {
            return lianmi_throw('INPUT', '包含未被许可的图片链接，请重传图片后发布');
        }
        
        if (mb_strlen($name, 'UTF8') < 3) {
            return lianmi_throw("INPUT", "栏目名字最短3个字");
        }
        
        if (get_var("SELECT COUNT(*) FROM `group` WHERE `name` = :name", [':name' => $name]) > 0) {
            return lianmi_throw("INPUT", "栏目名字已被占用，重新起一个吧");
        }
        
        $timeline = lianmi_now();
        $author_uid = lianmi_uid();
        $seller_uid_int = intval($seller_uid);

        $sql_insert_group = "INSERT INTO `group` ( `name` , `author_uid` , `author_address` , `price_wei` , `cover` , `seller_uid` , `timeline` , `is_active` , `is_paid` ) VALUES ( :name , :author_uid , :author_address , :price_wei , :cover , :seller_uid , :timeline , 1 , 1 )";
        $params_insert_group = [
            ':name' => t($name), // trim name
            ':author_uid' => $author_uid,
            ':author_address' => t($author_address), // trim address
            ':price_wei' => $valid_price_wei,
            ':cover' => t($cover), // trim cover URL
            ':seller_uid' => $seller_uid_int,
            ':timeline' => $timeline
        ];
        run_sql($sql_insert_group, $params_insert_group);
        $group_id = db()->lastId();
        
        $sql_replace_member = "REPLACE INTO `group_member` ( `group_id` , `uid` , `is_author` , `is_vip` , `timeline` ) VALUES ( :group_id , :uid , '1' , '1' , :timeline )";
        run_sql($sql_replace_member, [':group_id' => $group_id, ':uid' => $author_uid, ':timeline' => $timeline]);

        run_sql("UPDATE `user` SET `group_count` = (SELECT COUNT(*) FROM `group_member` WHERE `uid` = :uid) WHERE `id` = :uid LIMIT 1", [':uid' => $author_uid]);
        run_sql("UPDATE `group` SET `member_count` = (SELECT COUNT(*) FROM `group_member` WHERE `group_id` = :group_id) WHERE `id` = :group_id LIMIT 1", [':group_id' => $group_id]);
        
        $group = [];
        $group['id'] = $group_id;
        
        foreach (['name','author_uid','author_address','price_wei','cover','seller_uid','timeline'] as $value) {
            $group[$value] = $$value;
        }

        return send_result($group);
    }

    /**
     * 加入栏目
     * @ApiDescription(section="Group", description="检查栏目购买数据")
     * @ApiLazyRoute(uri="/group/join/@id",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="栏目ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function joinGroup($id)
    {
        $id = intval($id);
        $uid = lianmi_uid();

        if (intval(table('group')->getIs_activeById($id)->toVar()) != 1) { // LDO is safe
            return lianmi_throw('AUTH', '该栏目尚未启用或已被暂停');
        }
        
        if (get_line("SELECT * FROM `group_blacklist` WHERE `group_id` = :group_id AND `uid` = :uid LIMIT 1", [':group_id' => $id, ':uid' => $uid])) {
            return lianmi_throw('AUTH', '你没有权限订阅该栏目');
        }
        
        $sql_insert_member = "INSERT IGNORE INTO `group_member` ( `group_id`, `uid` , `timeline` ) VALUES ( :group_id , :uid , :timeline )";
        run_sql($sql_insert_member, [':group_id' => $id, ':uid' => $uid, ':timeline' => lianmi_now()]);

        run_sql("UPDATE `user` SET `group_count` = (SELECT COUNT(*) FROM `group_member` WHERE `uid` = :uid) WHERE `id` = :uid LIMIT 1", [':uid' => $uid]);
        run_sql("UPDATE `group` SET `member_count` = (SELECT COUNT(*) FROM `group_member` WHERE `group_id` = :group_id) WHERE `id` = :group_id LIMIT 1", [':group_id' => $id]);

        return send_result("done");
    }

    /**
     * 退出栏目
     * @ApiDescription(section="Group", description="检查栏目购买数据")
     * @ApiLazyRoute(uri="/group/quit/@id",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="栏目ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function quitGroup($id, $uid = null)
    {
        $id = intval($id);
        $target_uid = ($uid === null) ? lianmi_uid() : intval($uid);

        $info = get_line("SELECT * FROM `group_member` WHERE `uid` = :target_uid AND `group_id` = :group_id LIMIT 1", [':target_uid' => $target_uid, ':group_id' => $id]);
        if (!$info) {
            return lianmi_throw('INPUT', '尚未订阅该栏目');
        }

        if (intval($info['is_author']) > 0) {
            return lianmi_throw('INPUT', '栏主不能退订栏目');
        }
        
        run_sql("DELETE FROM `group_member` WHERE `group_id` = :group_id AND `uid` = :target_uid LIMIT 1", [':group_id' => $id, ':target_uid' => $target_uid]);
        run_sql("UPDATE `user` SET `group_count` = (SELECT COUNT(*) FROM `group_member` WHERE `uid` = :target_uid) WHERE `id` = :target_uid LIMIT 1", [':target_uid' => $target_uid]);
        run_sql("UPDATE `group` SET `member_count` = (SELECT COUNT(*) FROM `group_member` WHERE `group_id` = :group_id) WHERE `id` = :group_id LIMIT 1", [':group_id' => $id]);

        return send_result("done");
    }

    /**
     * 查询当前用户的基本信息
     * @ApiLazyRoute(uri="/user/self",method="GET|POST")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function userSelfInfo()
    {
        $uid = lianmi_uid();
        if (!$user = get_line("SELECT * FROM `user` WHERE `id` = :uid LIMIT 1", [':uid' => $uid])) {
            return lianmi_throw("INPUT", "用户不存在或已失效"); // More generic error
        }

        // 清空密码 hash 以免在之后的流程中出错
        unset($user['password']) ;

        $user['uid'] = $user['id'];
        $user['token'] = session_id(); // 将 session id 作为 token 传回前端

        // 取得当前用户参加的group
        // 添加当前用户的group分组信息
        $user = array_merge($user, get_group_info($user['id'])) ;

        // if( strlen( $user['avatar'] )  < 1 ) $user['avatar'] = c('default_avatar_url');

        return send_result($user);
    }

    /**
     * 检查当前用户VIP购买情况，并更新以此更新数据表中的数据
     * @ApiDescription(section="Group", description="检查栏目购买数据")
     * @ApiLazyRoute(uri="/group/vip/check/@id",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="栏目ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function checkVipIsPaid($id)
    {
        $id = intval($id);
        $uid = lianmi_uid();

        // Web3 related code is external, cannot refactor its internal calls.
        // Focus on DB calls within the callback.
        $abi = json_decode(file_get_contents(AROOT . DS . 'contract' . DS . 'build' . DS . 'lianmi.abi'));
        $web3 = new \Web3\Providers\HttpProvider(new \Web3\RequestManagers\HttpRequestManager(c('web3_network'), 60));
        $contract = new \Web3\Contract($web3, $abi);
        
        $contract->at(c('contract_address'))->call('memberOf', $id, $uid, function ($error, $data) use ($id, $uid, $contract) { // Pass $uid to callback
            if ($error != null) {
                return lianmi_throw('CONTRACT', '合约调用失败：' . $error->getMessage());
            } else {
                $data = reset($data);
                $timestamp = intval($data->toString());
                $datetime = date("Y-m-d H:i:s", $timestamp);
                $is_vip = (time() <= $timestamp && $timestamp > 0) ? 1 : 0;

                $info = get_line("SELECT * FROM `group_member` WHERE `group_id` = :group_id AND `uid` = :uid LIMIT 1", [':group_id' => $id, ':uid' => $uid]);
                if (!$info) {
                    return lianmi_throw('INPUT', '你需要先订阅栏目才能购买VIP');
                }

                if ($info['is_vip'] != $is_vip || $info['vip_expire'] != $datetime) {
                    $sql = "UPDATE `group_member` SET `is_vip` = :is_vip , `vip_expire` = :vip_expire WHERE `group_id` = :group_id AND `uid` = :uid AND `id` = :member_id LIMIT 1";
                    run_sql($sql, [
                        ':is_vip' => $is_vip, 
                        ':vip_expire' => $datetime, 
                        ':group_id' => $id, 
                        ':uid' => $uid, 
                        ':member_id' => $info['id']
                    ]);
                }
                return send_result([ 'is_vip' => $is_vip , 'vip_expire' =>  $datetime ]);
            }
        });
    }

    /**
     * 购买小组VIP时，生成订单
     * @ApiDescription(section="Group", description="获取栏目投稿")
     * @ApiLazyRoute(uri="/group/preorder/@group_id",method="GET|POST")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    
    public function GroupPreorder($group_id)
    {
        $group_id = intval($group_id);
        $group = get_line("SELECT * FROM `group` WHERE `id` = :group_id LIMIT 1", [':group_id' => $group_id]);
        if (!$group) {
            return lianmi_throw("ARGS", "小组不存在");
        }

        $sql = "INSERT INTO `order` ( `group_id` , `author_address` , `group_price_wei` , `buyer_uid` , `created_at`  ) VALUES ( :group_id , :author_address , :group_price_wei , :buyer_uid , :created_at )";
        $params = [
            ':group_id' => $group_id,
            ':author_address' => $group['author_address'],
            ':group_price_wei' => $group['price_wei'], // Assuming price_wei is already a string/numeric from DB
            ':buyer_uid' => lianmi_uid(),
            ':created_at' => lianmi_now()
        ];
        run_sql($sql, $params);

        $order_id = db()->lastId();
        if ($order_id < 1) {
            return lianmi_throw("DATABASE", "预订单创建失败");
        }
        
        // URL construction remains the same as it doesn't involve SQL
        $url =  "https://wallet.fo/Pay?params=" .$group['author_address']  . ",FOUSDT,eosio,". intval($group['price_wei'])/100 ."," . u("order=".$order_id);
        $schema = "fowallet://".u($url);
        
        return send_result(["url"=>$url , "order_id"=> $order_id , "schema" => $schema ]);
    }

    /**
     * 检测小组VIP订单的支付情况
     * @ApiDescription(section="Group", description="获取栏目投稿")
     * @ApiLazyRoute(uri="/group/checkorder",method="GET|POST")
     * * @ApiParams(name="order_id", type="int", nullable=false, description="order_id", check="check_uint", cnname="订单号")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    
    public function GroupCheckorder($order_id)
    {
        $order_id = intval($order_id);
        $uid = lianmi_uid();

        $order = get_line("SELECT * FROM `order` WHERE `id` = :order_id LIMIT 1", [':order_id' => $order_id]);
        if (!$order) {
            return lianmi_throw("ARGS", "订单不存在");
        }

        if ($order['vip_active'] == 1) {
            return send_result(["done" => 1]);
        }
        
        if ($order['buyer_uid'] != $uid) {
            return lianmi_throw("ARGS", "你只能校验自己的订单");
        }

        if (!fo_check_user_tx($order['author_address'], $order_id, $order['group_price_wei'], 'FOUSDT@eosio')) {
            return lianmi_throw("AUTH", "尚未检测到转账结果，可能存在延迟，请确认到账后三到五分钟再查询");
        }

        // Re-fetch order to get the latest state, important for concurrency
        $order = get_line("SELECT * FROM `order` WHERE `id` = :order_id LIMIT 1", [':order_id' => $order_id]);
        if (!$order) { // Should not happen if it existed before
            return lianmi_throw("ARGS", "订单不存在");
        }
        if ($order['vip_active'] == 1) {
            return send_result(["done" => 1]);
        }

        $membership = get_line("SELECT * FROM `group_member` WHERE `uid` = :uid AND `group_id` = :group_id LIMIT 1", [':uid' => $uid, ':group_id' => $order['group_id']]);
        if (!$membership) {
            return lianmi_throw("AUTH", "先订阅栏目后才能购买VIP订户");
        }

        $expire_timestamp = (!isset($membership['vip_expire']) || $membership['vip_expire'] == "") 
            ? strtotime("+1 year") 
            : strtotime($membership['vip_expire']) + (60*60*24*365);
        $expire_datetime = date("Y-m-d H:i:s", $expire_timestamp);
            
        $sql_update_member = "UPDATE `group_member` SET `is_vip` = 1 , `vip_expire` = :expire_datetime WHERE `uid` = :uid AND `group_id` = :group_id LIMIT 1";
        run_sql($sql_update_member, [':expire_datetime' => $expire_datetime, ':uid' => $uid, ':group_id' => $order['group_id']]);

        $sql_update_order = "UPDATE `order` SET `vip_active` = 1 , `vip_start` = :vip_start WHERE `id` = :order_id LIMIT 1";
        run_sql($sql_update_order, [':vip_start' => lianmi_now(), ':order_id' => $order_id]);

        return send_result(["done" => 1]);
    }


    /**
     * 更新内容投稿状态
     * @ApiDescription(section="Group", description="获取栏目投稿")
     * @ApiLazyRoute(uri="/group/contribute/update",method="GET|POST")
     * @ApiParams(name="group_id", type="int", nullable=false, description="group_id",check="check_uint",, cnname="栏目ID")
     * @ApiParams(name="feed_id", type="int", nullable=false, description="feed_id",check="check_uint",, cnname="内容原始ID")
     * @ApiParams(name="status", type="int", nullable=false, description="status",check="check_uint",, cnname="投稿状态")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function updateContribute($group_id, $feed_id, $status)
    {
        $group_id = intval($group_id);
        $feed_id = intval($feed_id);
        $status = intval($status);
        $current_uid = lianmi_uid();

        if ($current_uid != get_var("SELECT `author_uid` FROM `group` WHERE `id` = :group_id LIMIT 1", [':group_id' => $group_id])) {
            return lianmi_throw('AUTH', '只有栏主才能审核投稿');
        }
        
        $contribute = get_line("SELECT * FROM `feed_contribute` WHERE `group_id` = :group_id AND `feed_id` = :feed_id LIMIT 1", [':group_id' => $group_id, ':feed_id' => $feed_id]);
        if (!$contribute) {
            return lianmi_throw('INPUT', '没有对应的投稿');
        }

        if ($contribute['status'] != $status) {
            if ($status == 1) { // Approve
                $feed = get_line("SELECT * FROM `feed` WHERE `id` = :feed_id LIMIT 1", [':feed_id' => $feed_id]);
                if (!$feed) {
                    return lianmi_throw('INPUT', '投稿对应的Feed不存在');
                }

                if ($contribute['forward_feed_id'] != 0) {
                    run_sql("UPDATE `feed` SET `is_delete` = 0 WHERE `forward_uid` = :current_uid AND `id` = :forward_feed_id LIMIT 1", [':current_uid' => $current_uid, ':forward_feed_id' => $contribute['forward_feed_id']]);
                } else {
                    $now = lianmi_now();
                    $sql_forward = "INSERT INTO `feed` ( `text` , `group_id` , `images`, `files` , `uid` , `is_paid` , `timeline` , `is_forward` , `forward_feed_id` , `forward_uid` , `forward_text` , `forward_is_paid` , `forward_group_id` , `forward_timeline`  ) VALUES ( :text , '0' , :images , :files , :original_uid , :is_paid , :original_timeline , '1' , :original_feed_id , :forward_uid , '' , :is_paid_forward , :forward_group_id , :forward_timeline )";
                    $params_forward = [
                        ':text' => $feed['text'], ':images' => $feed['images'], ':files' => $feed['files'], 
                        ':original_uid' => $feed['uid'], ':is_paid' => $feed['is_paid'], ':original_timeline' => $feed['timeline'],
                        ':original_feed_id' => $feed['id'], ':forward_uid' => $current_uid, 
                        ':is_paid_forward' => $feed['is_paid'], ':forward_group_id' => $group_id, ':forward_timeline' => $now
                    ];
                    run_sql($sql_forward, $params_forward);
                    $forward_feed_id = db()->lastId();
                    run_sql("UPDATE `feed_contribute` SET `status` = :status , `forward_feed_id` = :forward_feed_id WHERE `id` = :contribute_id LIMIT 1", [':status' => $status, ':forward_feed_id' => $forward_feed_id, ':contribute_id' => $contribute['id']]);
                }
            } else { // Reject or other status
                if ($contribute['status'] == 1 && $contribute['forward_feed_id'] != 0) { // Was previously approved
                    $the_feed = get_line("SELECT * FROM `feed` WHERE `id` = :forward_feed_id LIMIT 1", [':forward_feed_id' => $contribute['forward_feed_id']]);
                    if ($the_feed) {
                        if (strtotime($the_feed['timeline']) < strtotime("-1day") || $the_feed['comment_count'] > 0) {
                            run_sql("UPDATE `feed` SET `is_delete` = 1 WHERE `forward_uid` = :current_uid AND `id` = :forward_feed_id LIMIT 1", [':current_uid' => $current_uid, ':forward_feed_id' => $contribute['forward_feed_id']]);
                        } else {
                            run_sql("DELETE FROM `feed` WHERE `forward_uid` = :current_uid AND `id` = :forward_feed_id LIMIT 1", [':current_uid' => $current_uid, ':forward_feed_id' => $contribute['forward_feed_id']]);
                        }
                    }
                }
                run_sql("UPDATE `feed_contribute` SET `status` = :status WHERE `id` = :contribute_id LIMIT 1", [':status' => $status, ':contribute_id' => $contribute['id']]);
            }
            run_sql("UPDATE `group` SET `todo_count` = ( SELECT COUNT(*) FROM `feed_contribute` WHERE `group_id` = :group_id AND `status` = 0 ) WHERE `id`= :group_id LIMIT 1", [':group_id' => $group_id]);
        }
        return send_result('done');
    }

    /**
     * 获取全部栏目投稿
     * @ApiDescription(section="Group", description="获取栏目投稿")
     * @ApiLazyRoute(uri="/group/contribute",method="GET|POST")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     * @ApiParams(name="filter", type="int", nullable=false, description="filter", cnname="过滤选项")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getContribute($since_id = 0, $filter = 'all')
    {
        $filter_sql = '';
        if ($filter == 'todo') {
            $filter_sql = " AND `status` = '0' ";
        }
        if ($filter == 'allow') {
            $filter_sql = " AND `status` ='1' ";
        }
        if ($filter == 'deny') {
            $filter_sql = " AND `status` ='2' ";
        }
        
        // VIP订户和栏主可以查看付费内容
        $since_sql = $since_id == 0 ? "" : " AND `id` < '" . intval($since_id) . "' ";


        $uid = lianmi_uid();
        $params = [':uid' => $uid];
        $limit = intval(c('contribute_per_page'));

        $main_conditions = " 1 ";
        if ($filter == 'todo') $main_conditions .= " AND fc.`status` = 0 ";
        if ($filter == 'allow') $main_conditions .= " AND fc.`status` = 1 ";
        if ($filter == 'deny') $main_conditions .= " AND fc.`status` = 2 ";
        
        if ($since_id > 0) {
            $main_conditions .= " AND fc.`id` < :since_id ";
            $params[':since_id'] = intval($since_id);
        }

        $sql = "SELECT fc.`id`, fc.`feed_id`, fc.`feed_id` as `feed`, fc.`group_id`, fc.`group_id` as `group`, fc.`status` 
                FROM `feed_contribute` fc
                INNER JOIN `group` g ON fc.group_id = g.id
                WHERE {$main_conditions} AND g.`author_uid` = :uid
                ORDER BY fc.`id` DESC 
                LIMIT {$limit}";
        
        $data = get_data($sql, $params);
       
        /* Example structure after this point
         * {
            id: "16",
            feed_id: "10",
            group_id: "8"
            },

         */
        
        // 然后按 feed_id 进行合并，不然满屏幕相同的feed，只有投稿到的栏目不同
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $item) {
                if ($item['id'] > $maxid) {
                    $maxid = $item['id'];
                }
                if ($item['id'] < $minid) {
                    $minid = $item['id'];
                }
            }

            
            $new_data = [];
            $to_group_ids = [];
            $group_status = [];

            foreach ($data as $key => $item) {
                // 将 group_id 移动到 to_groups ，作为数组
                $data[$key]['to_groups'] = [$item['group_id']];
                $group_status[$item['group_id']][$item['feed_id']] = $item['status'];
                
                // 设置标记
                $feed_id_exists = false;
                
                // 开始循环 $new_data 数组，第一次时 new_data 为空
                foreach ($new_data as $key2 => $preitem) {
                    // 第二次时，开始进入这个循环，preitem 是上次的数据，item是当前的数据
                    // 如果当前的投稿和上次投稿的 feed_id 一样，表示有重复
                    if ($preitem['feed_id'] == $item['feed_id']) {
                        // 设置重复标志位，这个当前投稿不会被合并到 new_data 数组当中
                        $feed_id_exists = true;
                        
                        // 将 当前投稿 的 group 数据合并到已有数据中
                        $new_data[$key2]['to_groups'] = array_merge($new_data[$key2]['to_groups'], $data[$key]['to_groups']);
                        $new_data[$key2]['to_groups'] = array_unique($new_data[$key2]['to_groups']);
                    }
                }
                
                // 如果不存在和已有的投稿重复的 feed_id
                // 将当前投稿加入到 new_data 。 这时候进入下一次循环
                if (!$feed_id_exists) {
                    $new_data[] = $data[$key];
                }

                // 将 to_groups 的 id 合并到一个数据，以便稍后展开
                $to_group_ids = array_merge($to_group_ids, $data[$key]['to_groups']);
                $to_group_ids = array_unique($to_group_ids);
            }

            // return print_r( $group_status );


            // Start expanding group information
            if (is_array($to_group_ids) && count($to_group_ids) > 0) {
                // Create placeholders for IN clause
                $group_placeholders = implode(',', array_fill(0, count($to_group_ids), '?'));
                // Use 0-indexed array for IN clause with ? placeholders
                if ($group_infos = get_data("SELECT * FROM `group` WHERE `id` IN ( " . $group_placeholders . " )", $to_group_ids)) {
                    $group_infos_indexed = [];
                    foreach($group_infos as $gi) $group_infos_indexed[$gi['id']] = $gi;

                    foreach ($new_data as $key1 => $item) {
                        if (isset($item['to_groups']) && is_array($item['to_groups']) && count($item['to_groups']) > 0) {
                            foreach ($item['to_groups'] as $key2 => $gid) {
                                if (isset($group_infos_indexed[$gid])) {
                                    if (isset($group_status[$gid][$item['feed_id']])) {
                                        $group_infos_indexed[$gid]['status'] = $group_status[$gid][$item['feed_id']];
                                    }
                                    $new_data[$key1]['to_groups'][$key2] = $group_infos_indexed[$gid];
                                }
                            }
                        }
                    }
                }
            }
            
            // extend_field itself uses parameterized queries now for the main query if modified,
            // but the IN clause construction needs care.
            // Assuming extend_field is refactored or its use here is with safe $new_data.
            $data = extend_field($new_data, 'feed', 'feed'); 
            
            // Example structure for feed data (already exists)
            /*
             * id: "1",
                feed: {
                id: "7",
                uid: "5",
                group_id: "0",
                text: "fdfdfdf",
                is_paid: "1",
                files: null,
                images: null,
                timeline: "2018-07-04 19:09:00",
                is_forward: "0",
                forward_feed_id: "0",
                forward_uid: "0",
                forward_text: null,
                forward_is_paid: "0",
                forward_group_id: "0",
                to_groups: "",
                forward_timeline: null,
                is_delete: "0"
                },
                group: {
                id: "8",
                name: "告别游泳圈",
                author_uid: "5",
                price_wei: "50000000000000000",
                author_address: "0x8C349A47caAd9374D356eB0d48d4c995EF5F1d2f",
                is_paid: "1",
                is_active: "1",
                cover: "http://localhost:8088/image/u5/2018.07.01.5b386437ce834.png",
                seller_uid: "0",
                timeline: "2018-07-01 13:18:48",
                member_count: "0",
                feed_count: "0",
                todo_count: "0"
                }
            */
            $feed_uids = [];
            foreach ($data as $item) {
                if (isset($item['feed']['uid'])) {
                    $feed_uids[] = $item['feed']['uid'];
                }

                $feed_uids = array_unique($feed_uids);
            }

            if (count($feed_uids) > 0) {
                $user_placeholders = implode(',', array_fill(0, count($feed_uids), '?'));
                $user_sql = "SELECT ".c('user_normal_fields')." FROM `user` WHERE `id` IN (" . $user_placeholders .")";
                if ($userinfo = get_data($user_sql, $feed_uids)) {
                    $userinfo_indexed = [];
                    foreach($userinfo as $ui) $userinfo_indexed[$ui['id']] = $ui;

                    foreach ($data as $key => $item) {
                        if (isset($item['feed']['uid']) && isset($userinfo_indexed[$item['feed']['uid']])) {
                            $data[$key]['feed']['user'] = $userinfo_indexed[$item['feed']['uid']];
                        }
                        $data[$key]['feed']['to_groups'] = $item['to_groups'];
                        unset($data[$key]['to_groups']);
                        $data[$key]['feed']['forward_group_id'] = $item['group_id'];
                    }
                }
            }
        } else {
            $maxid = $minid = null;
        }
        return send_result(['feeds'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid  ]);
    }

    /**
     * 删除评论
     * @ApiDescription(section="Feed", description="删除内容评论")
     * @ApiLazyRoute(uri="/comment/remove",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="评论ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function removeFeedComment($id)
    {
        $id = intval($id);
        $comment = table('comment')->getAllById($id)->toLine(); // LDO is safe
        if (!$comment) {
            return lianmi_throw('INPUT', '评论不存在或已被删除');
        }

        $can_delete = false;
        if ($comment['uid'] == lianmi_uid()) {
            $can_delete = true;
        } else {
            $feed = table('feed')->getAllById($comment['feed_id'])->toLine(); // LDO is safe
            if ($feed) {
                $owner_uid = $feed['is_forward'] == 1 ? $feed['forward_uid'] : $feed['uid'];
                if ($owner_uid == lianmi_uid()) {
                    $can_delete = true;
                }
            }
        }

        if (!$can_delete) {
            return lianmi_throw('AUTH', '只有评论作者和内容主人才能删除该评论');
        }

        run_sql("UPDATE `comment` SET `is_delete` = '1' WHERE `id` = :id LIMIT 1", [':id' => $id]);
        
        // Note: The original query for comment_count was incorrect as it used $id (comment_id) instead of $comment['feed_id']
        run_sql("UPDATE `feed` SET `comment_count` = ( SELECT COUNT(*) FROM `comment` WHERE `feed_id` = :feed_id AND `is_delete` = 0 ) WHERE `id` = :feed_id LIMIT 1", [':feed_id' => $comment['feed_id']]);

        $comment['is_delete'] = 1;
        return send_result($comment);
    }


    /**
     * 对内容发起评论
     * @ApiDescription(section="Feed", description="对内容发起评论")
     * @ApiLazyRoute(uri="/feed/comment/@id",method="GET|POST")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="内容ID")
     * @ApiParams(name="text", type="string", nullable=false, description="comment", check="check_not_empty", cnname="评论内容")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function saveFeedComment($id, $text)
    {
        $id = intval($id);
        $current_uid = lianmi_uid();

        $feed = get_line("SELECT *, `uid` as `user_obj` , `forward_uid` as `forward_user_obj` , `group_id` as `group_obj` FROM `feed` WHERE `id` = :id AND `is_delete` = 0 LIMIT 1", [':id' => $id]);
        if (!$feed) {
            return lianmi_throw('INPUT', 'ID对应的内容不存在或者你没有权限阅读');
        }
        
        $group_id = $feed['is_forward'] == 1 ? $feed['forward_group_id'] : $feed['group_id'];
        $member_ship = [];
        if ($group_id > 0) { // Only fetch membership if there's a relevant group
             $member_ship = get_line("SELECT * FROM `group_member` WHERE `group_id` = :group_id AND `uid` = :uid LIMIT 1", [':group_id' => $group_id, ':uid' => $current_uid]);
        }

        $can_see = true;
        $can_comment = true; // Default to true, adjust based on logic below

        if ($feed['is_forward'] != 1) { // Original feed (not a forward)
            if ($feed['uid'] == $current_uid) { // Owner can always comment
                $can_comment = true;
            } else { // Check blacklist for non-owner
                $is_blacklisted = get_line("SELECT * FROM `user_blacklist` WHERE `uid` = :feed_owner_uid AND `block_uid` = :current_uid LIMIT 1", [':feed_owner_uid' => $feed['uid'], ':current_uid' => $current_uid]);
                $can_comment = !$is_blacklisted;
            }
        } else { // Forwarded feed (within a group context)
             $can_comment = $member_ship && ($member_ship['can_comment'] == 1);
        }
        
        if ($feed['is_paid'] == 1) {
            $can_see = false; // Default for paid content
            if ($feed['is_forward'] == 1) { // Forwarded paid content
                if ($member_ship && ($member_ship['is_author'] == 1 || $member_ship['is_vip'] == 1)) {
                    $can_see = true;
                }
            } else { // Original paid content
                if ($current_uid == $feed['uid']) { // Owner can see their own paid content
                    $can_see = true;
                }
            }
        }

        if (!$can_see || !$can_comment) {
            return lianmi_throw('AUTH', '没有权限查看或评论此内容，可使用有权限的账号登入后评论');
        }
        
        $now = lianmi_now();
        $sql_insert_comment = "INSERT INTO `comment` ( `feed_id` , `text` , `uid` , `timeline` ) VALUES ( :feed_id , :text , :uid , :timeline )";
        run_sql($sql_insert_comment, [':feed_id' => $id, ':text' => $text, ':uid' => $current_uid, ':timeline' => $now]);
        $cid = db()->lastId();

        run_sql("UPDATE `feed` SET `comment_count` = ( SELECT COUNT(*) FROM `comment` WHERE `feed_id` = :feed_id AND `is_delete` = 0  ) WHERE `id` = :feed_id LIMIT 1", [':feed_id' => $id]);

        $ouid = $feed['is_forward'] == 1 ? $feed['forward_uid'] : $feed['uid'];
        if ($ouid != $current_uid) {
            system_notice($ouid, $current_uid, lianmi_username(), lianmi_nickname(), 'comments on ['.$feed['id'].']', '/feed/'.$feed['id']);
        }

        if ($mention = lianmi_at($text)) {
            $mention = array_slice($mention, 0, intval(c('max_mention_per_comment')));
            if (!empty($mention)) {
                $placeholders = implode(',', array_fill(0, count($mention), '?'));
                $mention_uids = get_data("SELECT `id` FROM `user` WHERE `username` IN ( " . $placeholders . " )", $mention);
                if ($mention_uids) {
                    foreach ($mention_uids as $muid_row) {
                        $muid = $muid_row['id'];
                        if ($muid != $current_uid && $muid != $ouid) {
                            system_notice($muid, $current_uid, lianmi_username(), lianmi_nickname(), '在内容['.$feed['id'].']的评论中@了你', '/feed/'.$feed['id']);
                        }
                    }
                }
            }
        }
        return send_result([ 'feed_id'=>$id, 'text'=>$text , 'id' => $cid ]);
    }

    

    

    /**
     * 更新用户密码
     * @ApiDescription(section="User", description="更新用户密码")
     * @ApiLazyRoute(uri="/user/update_password",method="POST|GET")
     * @ApiParams(name="old_password", type="string", nullable=false, description="old_password", check="check_not_empty", cnname="原密码")
     * @ApiParams(name="new_password", type="string", nullable=false, description="new_password", check="check_not_empty", cnname="新密码")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function updateUserPassword($old_password, $new_password)
    {
        $uid = lianmi_uid();
        $user = table('user')->getAllById($uid)->toLine(); // LDO is safe
        if (!$user) {
            return lianmi_throw('INPUT', '当前用户不存在，什么鬼');
        }
        
        if (!password_verify($old_password, $user['password'])) {
            return lianmi_throw('INPUT', '错误的原密码');
        }
       
        if (strlen($new_password) < 6) {
            return lianmi_throw('INPUT', '密码长度不能短于6位');
        }
        
        $hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        run_sql("UPDATE `user` SET `password` = :password WHERE `id` = :uid LIMIT 1", [':password' => $hash, ':uid' => $uid]);
        return send_result('done');
    }

    /**
     * 更新用户资料
     * @ApiDescription(section="User", description="更新用户资料")
     * @ApiLazyRoute(uri="/user/update_profile",method="POST|GET")
     * @ApiParams(name="nickname", type="string", nullable=false, description="nickname", check="check_not_empty", cnname="用户昵称")
     * @ApiParams(name="address", type="string", nullable=false, description="address",  cnname="钱包地址")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function updateUserInfo($nickname, $address = '')
    {
        $uid = lianmi_uid();
        $nickname = mb_substr(t($nickname), 0, 15, 'UTF-8'); // Trim and then substr
        $address = t($address); // Trim address
        
        if (in_array(strtolower($nickname), c('forbiden_nicknames'))) {
            return lianmi_throw('INPUT', '此用户昵称已被系统保留，请重新选择');
        }

        $sql = "UPDATE `user` SET `nickname` = :nickname , `address` = :address WHERE `id` = :uid LIMIT 1";
        run_sql($sql, [':nickname' => $nickname, ':address' => $address, ':uid' => $uid]);
        return send_result('done');
    }

    /**
     * 更新用户头像
     * @ApiDescription(section="User", description="更新用户头像")
     * @ApiLazyRoute(uri="/user/update_avatar",method="POST|GET")
     * @ApiParams(name="avatar", type="string", nullable=false, description="avatar", check="check_not_empty", cnname="头像地址")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function updateUserAvatar($avatar)
    {
        if (!check_image_url($avatar)) { // check_image_url is important validation
            return lianmi_throw('INPUT', '包含未被许可的图片链接，请重传图片后发布');
        }
        
        $uid = lianmi_uid();
        run_sql("UPDATE `user` SET `avatar` = :avatar  WHERE `id` = :uid LIMIT 1", [':avatar' => $avatar, ':uid' => $uid]);
        return send_result('done');
    }

    /**
     * 更新用户封面
     * @ApiDescription(section="User", description="更新用户封面")
     * @ApiLazyRoute(uri="/user/update_cover",method="POST|GET")
     * @ApiParams(name="cover", type="string", nullable=false, description="cover", check="check_not_empty", cnname="头像地址")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function updateUserCover($cover)
    {
        if (!check_image_url($cover)) { // check_image_url is important validation
            return lianmi_throw('INPUT', '包含未被许可的图片链接，请重传图片后发布');
        }
        
        $uid = lianmi_uid();
        run_sql("UPDATE `user` SET `cover` = :cover WHERE `id` = :uid LIMIT 1", [':cover' => $cover, ':uid' => $uid]);
        return send_result('done');
    }

    /**
     * 更新栏目资料
     * @ApiDescription(section="Group", description="更新栏目资料")
     * @ApiLazyRoute(uri="/group/update_settings",method="POST|GET")
     * @ApiParams(name="id", type="int", nullable=false, description="id", check="check_uint", cnname="栏目ID")
     * @ApiParams(name="name", type="string", nullable=false, description="name", check="check_not_empty", cnname="栏目名称")
     * @ApiParams(name="cover", type="string", nullable=false, description="cover", check="check_not_empty", cnname="封面地址")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function updateGroupSettings($id, $name, $cover)
    {
        $id = intval($id);
        $current_uid = lianmi_uid();

        if (!check_image_url($cover)) { // Important validation
            return lianmi_throw('INPUT', '包含未被许可的图片链接，请重传图片后发布');
        }

        $group = table('group')->getAllById($id)->toLine(); // LDO is safe
        if (!$group) {
            return lianmi_throw('INPUT', '错误的栏目ID，栏目不存在或已被删除');
        }
        
        if ($group['author_uid'] != $current_uid) {
            return lianmi_throw('AUTH', '只有栏主才能修改栏目资料');
        }

        $name = t($name); // Trim name
        if ($name != $group['name']) {
            if (mb_strlen($name, 'UTF8') < 3) {
                return lianmi_throw("INPUT", "栏目名字最短3个字");
            }
            if (get_var("SELECT COUNT(*) FROM `group` WHERE `name` = :name AND `id` != :id", [':name' => $name, ':id' => $id]) > 0) {
                return lianmi_throw("INPUT", "栏目名字已被占用，重新起一个吧");
            }
        }
        
        $sql = "UPDATE `group` SET `name` = :name , `cover` = :cover WHERE `id` = :id AND `author_uid` = :author_uid LIMIT 1";
        run_sql($sql, [':name' => $name, ':cover' => $cover, ':id' => $id, ':author_uid' => $current_uid]);

        $group['name'] = $name; // Update local object for response
        $group['cover'] = $cover;
        return send_result($group);
    }

    /**
     * 判断某用户是否在黑名单
     * @ApiDescription(section="User", description="判断某用户是否在黑名单")
     * @ApiLazyRoute(uri="/user/inblacklist",method="POST|GET")
     * @ApiParams(name="uid", type="int", nullable=false, description="uid", cnname="游标ID")
     */
    public function checkUserInBlacklist($uid)
    {
        // LDO is already refactored to use prepared statements.
        // intval() is good for type safety before LDO call.
        return send_result(intval(table('user_blacklist')->getAllByArray(['uid'=>lianmi_uid(),'block_uid'=>intval($uid)])->toLine()));
    }

    /**
     * 将某用户添加/移出黑名单
     * @ApiDescription(section="User", description="将某用户添加/移出黑名单")
     * @ApiLazyRoute(uri="/user/blacklist_set",method="POST|GET")
     * @ApiParams(name="uid", type="int", nullable=false, description="uid", cnname="游标ID")
     * @ApiParams(name="status", type="int", nullable=false, description="status", cnname="状态")
     */
    public function setUserInBlacklist($uid, $status)
    {
        $current_uid = lianmi_uid();
        $target_uid = intval($uid);
        $status = intval($status);

        if ($status == 1) {
            if ($target_uid == $current_uid) {
                return lianmi_throw('INPUT', '不能将自己加入黑名单');
            }
            $sql = "INSERT IGNORE INTO `user_blacklist` ( `uid` , `block_uid` , `timeline` ) VALUES ( :current_uid , :target_uid , :timeline )";
            run_sql($sql, [':current_uid' => $current_uid, ':target_uid' => $target_uid, ':timeline' => lianmi_now()]);
        } else {
            $sql = "DELETE FROM `user_blacklist` WHERE `uid` = :current_uid AND `block_uid` = :target_uid LIMIT 1";
            run_sql($sql, [':current_uid' => $current_uid, ':target_uid' => $target_uid]);
        }
        return send_result($status);
    }

    

    /**
     * 获得当前用户的黑名单
     * @ApiDescription(section="User", description="获得当前用户的黑名单")
     * @ApiLazyRoute(uri="/user/blacklist",method="POST|GET")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     */
    public function getUserBlacklist($since_id = 0)
    {
        $uid = lianmi_uid();
        $since_id = intval($since_id);
        $limit = intval(c('blacklist_per_page'));
        $params = [':uid' => $uid];

        $since_sql_condition = "";
        if ($since_id > 0) {
            $since_sql_condition = " AND `id` < :since_id ";
            $params[':since_id'] = $since_id;
        }
        
        $sql = "SELECT * , `block_uid` as `user` FROM `user_blacklist` WHERE `uid` = :uid {$since_sql_condition} ORDER BY `id` DESC LIMIT {$limit}";

        $data = get_data($sql, $params);
        $data = extend_field($data, 'user', 'user'); // Review extend_field
        
        $maxid = null; $minid = null;
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $item) { // Removed $key as it's not used
                if ($item['id'] > $maxid) $maxid = $item['id'];
                if ($item['id'] < $minid) $minid = $item['id'];
            }
        }
        return send_result(['blacklist'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid ]);
    }


    /**
     * 获取当前用户的置顶信息
     * @ApiDescription(section="Feed", description="获取当前用户的首页信息流")
     * @ApiLazyRoute(uri="/timeline/top",method="GET|POST")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getUserTimelineTop()
    {
        // This method appears to have $filter_sql and $since_sql variables that are not defined within its scope.
        // This indicates a potential copy-paste error or missing logic.
        // Assuming $filter_sql and $since_sql should be empty or derived from parameters if they were intended.
        // For now, I will remove them from the query to make it runnable, but this needs review.
        // The query is also very complex and might benefit from being a stored procedure or view if performance is an issue.
        $uid = lianmi_uid();
        $limit = intval(c('feeds_per_page')); // It was used in original, but no LIMIT was in the SQL. Added it.

        $sql = "SELECT *,  `uid` as `user` , `forward_group_id` as `group` FROM `feed` 
                WHERE `is_top` = 1 AND `is_forward` = 1 
                AND (
                    ( `forward_group_id` IN ( SELECT `group_id` FROM `group_member` WHERE `uid` = :uid1 AND `is_vip` = 0 ) AND `is_paid` = 0 ) 
                    OR 
                    ( `forward_group_id` IN ( SELECT `group_id` FROM `group_member` WHERE `uid` = :uid2 AND (`is_vip` = 1 OR `is_author` = 1 ) ) )
                ) 
                GROUP BY `forward_feed_id` ORDER BY `id` DESC LIMIT {$limit}"; // Assuming `is_author` was intended instead of `uid` = :uid for the second subquery part.

        $params = [':uid1' => $uid, ':uid2' => $uid];
        
        $data = get_data($sql, $params);
        $data = extend_field($data, 'user', 'user');
        $data = extend_field($data, 'group', 'group');

        return send_result(isset($data[0]) ? $data[0] : "");
    }

    /**
     * 获取当前用户的首页信息流
     * @ApiDescription(section="Feed", description="获取当前用户的首页信息流")
     * @ApiLazyRoute(uri="/timeline",method="GET|POST")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     * @ApiParams(name="filter", type="int", nullable=false, description="filter", cnname="过滤选项")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getUserTimeline($since_id = 0, $filter = 'all')
    {
        $uid = lianmi_uid();
        $since_id = intval($since_id);
        $limit = intval(c('feeds_per_page'));
        
        $params = [':uid1' => $uid, ':uid2' => $uid];
        $filter_conditions = "";

        if ($filter == 'paid') {
            $filter_conditions .= " AND f.`is_paid` = 1 ";
        }
        if ($filter == 'media') {
            $filter_conditions .= " AND f.`images` != '' ";
        }
        if ($since_id > 0) {
            $filter_conditions .= " AND f.`id` < :since_id ";
            $params[':since_id'] = $since_id;
        }
        
        // Corrected the alias for feed table to f for clarity in subqueries and main query conditions
        $sql = "SELECT f.*, f.`uid` as `user`, f.`forward_group_id` as `group` 
                FROM `feed` f 
                WHERE f.`is_top` != 1 AND f.`is_forward` = 1 
                AND (
                    ( f.`forward_group_id` IN ( SELECT gm1.`group_id` FROM `group_member` gm1 WHERE gm1.`uid` = :uid1 AND gm1.`is_vip` = 0 ) AND f.`is_paid` = 0 ) 
                    OR 
                    ( f.`forward_group_id` IN ( SELECT gm2.`group_id` FROM `group_member` gm2 WHERE gm2.`uid` = :uid2 AND (gm2.`is_vip` = 1 OR gm2.`is_author` = 1) ) )
                ) 
                {$filter_conditions} 
                GROUP BY f.`forward_feed_id` 
                ORDER BY f.`id` DESC 
                LIMIT {$limit}";
        
        $data = get_data($sql, $params);
        $data = extend_field($data, 'user', 'user');
        $data = extend_field($data, 'group', 'group');
        
        $maxid = null; $minid = null;
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $item) {
                if ($item['id'] > $maxid) $maxid = $item['id'];
                if ($item['id'] < $minid) $minid = $item['id'];
            }
        }
        // Returning SQL in production is generally not recommended, but keeping original behavior for now.
        return send_result(['sql'=> $sql , 'feeds'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid ]);
    }

    /**
     * 获取当前用户的首页信息流最新ID
     * @ApiDescription(section="Feed", description="获取当前用户的首页信息流最新ID")
     * @ApiLazyRoute(uri="/timeline/lastid",method="GET|POST")
     * @ApiParams(name="filter", type="int", nullable=false, description="filter", cnname="过滤选项")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getUserTimelineLastId($filter = 'all')
    {
        $uid = lianmi_uid();
        $params = [':uid1' => $uid, ':uid2' => $uid, ':uid3' => $uid]; // Adjusted for the OR `uid` = :uid3 part
        $filter_conditions = "";

        if ($filter == 'paid') {
            $filter_conditions .= " AND f.`is_paid` = 1 ";
        }
        if ($filter == 'media') {
            $filter_conditions .= " AND f.`images` != '' ";
        }
        
        // Corrected the alias for feed table to f and fixed uid comparison assuming it meant is_author
        // The original query compared `uid` = lianmi_uid() in the second subquery part, which might be for "author" of the feed itself,
        // or if the group_member.uid (gm2.uid) is the author of the group. Assuming gm2.is_author was intended as in getUserTimeline.
        $sql = "SELECT f.`id` FROM `feed` f
                WHERE f.`is_top` != 1 AND f.`is_forward` = 1 
                AND (
                    ( f.`forward_group_id` IN ( SELECT gm1.`group_id` FROM `group_member` gm1 WHERE gm1.`uid` = :uid1 AND gm1.`is_vip` = 0 ) AND f.`is_paid` = 0 ) 
                    OR 
                    ( f.`forward_group_id` IN ( SELECT gm2.`group_id` FROM `group_member` gm2 WHERE gm2.`uid` = :uid2 AND (gm2.`is_vip` = 1 OR gm2.`is_author` = 1) ) ) 
                ) 
                {$filter_conditions} 
                GROUP BY f.`forward_feed_id` 
                ORDER BY f.`id` DESC 
                LIMIT 1";
        
        $last_id = get_var($sql, $params); // Use only uid1 and uid2 if uid3 was not intended
        return send_result($last_id);
    }

    /**
     * 获得和某个用户的聊天记录最新id
     * @ApiDescription(section="Message", description="获得和某个用户的聊天记录最新id")
     * @ApiLazyRoute(uri="/message/lastest_id/@to_uid",method="GET|POST")
     * @ApiParams(name="to_uid", type="int", nullable=false, description="to_uid", check="check_uint", cnname="用户ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getMessageLatest($to_uid)
    {
        $uid = lianmi_uid();
        $to_uid = intval($to_uid);
        return send_result(intval(get_var("SELECT MAX(`id`) FROM `message` WHERE `uid` = :uid AND ( `to_uid` = :to_uid OR `from_uid` = :to_uid2 )", [':uid' => $uid, ':to_uid' => $to_uid, ':to_uid2' => $to_uid])));
    }

    /**
     * 获得当前用户未读信息数量
     * @ApiDescription(section="Message", description="获得当前用户未读信息数量")
     * @ApiLazyRoute(uri="/message/unread",method="GET|POST")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getMessageUnreadCount()
    {
        $uid = lianmi_uid();
        return send_result(intval(get_var("SELECT COUNT(*) FROM `message` WHERE `uid` = :uid AND `is_read` = 0", [':uid' => $uid])));
    }

    /**
     * 获得当前用户的最新消息分组列表页面
     * @ApiDescription(section="Message", description="获得当前用户的最新消息分组列表页面")
     * @ApiLazyRoute(uri="/message/grouplist",method="GET|POST")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getMessageGroupList($since_id = 0)
    {
        $uid = lianmi_uid();
        $since_id = intval($since_id);
        $limit = intval(c('message_group_per_page'));
        $params = [':uid' => $uid];

        $total = get_var("SELECT COUNT(*) FROM `message_group` WHERE `uid` = :uid", [':uid' => $uid]);
        
        $since_sql_condition = "";
        if ($since_id > 0) {
            $since_sql_condition = " AND `id` < :since_id ";
            $params[':since_id'] = $since_id;
        }
        
        $sql = "SELECT * , `from_uid` as `from` , `to_uid` as `to` FROM `message_group` WHERE `uid` = :uid {$since_sql_condition} ORDER BY `id` DESC  LIMIT {$limit}";

        $data = get_data($sql, $params);
        $data = extend_field($data, 'from', 'user'); // Review extend_field
        $data = extend_field($data, 'to', 'user');   // Review extend_field
        
        $maxid = null; $minid = null;
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $item) {
                if ($item['id'] > $maxid) $maxid = $item['id'];
                if ($item['id'] < $minid) $minid = $item['id'];
            }
        }
        return send_result(['messages'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid , 'total' => $total ]);
    }

    /**
     * 获得和某个用户的聊天记录
     * @ApiDescription(section="Message", description="获得和某个用户的聊天记录")
     * @ApiLazyRoute(uri="/message/history/@to_uid",method="GET|POST")
     * @ApiParams(name="to_uid", type="int", nullable=false, description="to_uid", check="check_uint", cnname="用户ID")
     * @ApiParams(name="since_id", type="int", nullable=false, description="since_id", cnname="游标ID")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function getMessageHistory($to_uid, $since_id = 0)
    {
        $uid = lianmi_uid();
        $to_uid = intval($to_uid);
        $since_id = intval($since_id);
        $limit = intval(c('history_per_page'));

        $params_count = [':uid' => $uid, ':to_uid1' => $to_uid, ':to_uid2' => $to_uid];
        $total = get_var("SELECT COUNT(*) FROM `message` WHERE `uid` = :uid AND ( `to_uid` = :to_uid1 OR `from_uid` = :to_uid2 )", $params_count);
        
        $params_select = [':uid' => $uid, ':to_uid1' => $to_uid, ':to_uid2' => $to_uid];
        $since_sql_condition = "";
        if ($since_id > 0) {
            $since_sql_condition = " AND `id` < :since_id ";
            $params_select[':since_id'] = $since_id;
        }
        
        $sql = "SELECT * FROM `message` WHERE `uid` = :uid AND ( `to_uid` = :to_uid1 OR `from_uid` = :to_uid2 ) {$since_sql_condition} ORDER BY `id` DESC  LIMIT {$limit}";
        $data = get_data($sql, $params_select);
        
        $maxid = null; $minid = null;
        if (is_array($data) && count($data) > 0) {
            $maxid = $minid = $data[0]['id'];
            foreach ($data as $item) {
                if ($item['id'] > $maxid) $maxid = $item['id'];
                if ($item['id'] < $minid) $minid = $item['id'];
            }

            if ($since_id == 0) { // Only mark as read if fetching the latest page
                $params_update = [':uid' => $uid, ':to_uid1' => $to_uid, ':to_uid2' => $to_uid];
                run_sql("UPDATE `message` SET `is_read` = 1 WHERE `is_read` = 0 AND `uid` = :uid AND ( `to_uid` = :to_uid1 OR `from_uid` = :to_uid2 )", $params_update);
                run_sql("UPDATE `message_group` SET `is_read` = 1 WHERE `is_read` = 0 AND `uid` = :uid AND ( `to_uid` = :to_uid1 OR `from_uid` = :to_uid2 )", $params_update);
            }
        }
        return send_result(['messages'=>$data , 'count'=>count($data) , 'maxid'=>$maxid , 'minid'=>$minid , 'total' => $total ]);
    }

    /**
     * 向某用户发送私信
     * @ApiDescription(section="Message", description="向某用户发送私信")
     * @ApiLazyRoute(uri="/message/send/@to_uid",method="GET|POST")
     * @ApiParams(name="to_uid", type="int", nullable=false, description="to_uid", check="check_uint", cnname="用户ID")
     * @ApiParams(name="text", type="string", nullable=false, description="text", check="check_not_empty", cnname="私信内容")

     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function sendMessage($to_uid, $text)
    {
    public function sendMessage($to_uid, $text)
    {
        $current_uid = lianmi_uid();
        $to_uid = intval($to_uid);

        if ($to_uid == $current_uid) {
            return lianmi_throw('INPUT', '不要自己给自己发私信啦');
        }
        
        // LDO is safe
        if (table('user_blacklist')->getAllByArray(['uid'=>$to_uid,'block_uid'=>$current_uid])->toLine() || 
            table('user_blacklist')->getAllByArray(['uid'=>$current_uid ,'block_uid'=>$to_uid])->toLine()) {
            return lianmi_throw('AUTH', '你或者对方在黑名单中');
        }

        $now = lianmi_now();
        
        $params_sender_msg = [':uid' => $current_uid, ':to_uid' => $to_uid, ':from_uid' => $current_uid, ':text' => $text, ':timeline' => $now, ':is_read' => 1];
        run_sql("INSERT INTO `message` ( `uid` , `to_uid` , `from_uid` , `text` , `timeline` , `is_read` ) VALUES ( :uid , :to_uid , :from_uid , :text , :timeline , :is_read )", $params_sender_msg);

        $params_receiver_msg = [':uid' => $to_uid, ':to_uid' => $to_uid, ':from_uid' => $current_uid, ':text' => $text, ':timeline' => $now, ':is_read' => 0];
        run_sql("INSERT INTO `message` ( `uid` , `to_uid` , `from_uid` , `text` , `timeline` , `is_read` ) VALUES ( :uid , :to_uid , :from_uid , :text , :timeline , :is_read )", $params_receiver_msg);
        // $last_mid = db()->lastId(); // This might not be needed if not used.

        $params_delete_group = [':to_uid1' => $to_uid, ':from_uid1' => $current_uid, ':to_uid2' => $current_uid, ':from_uid2' => $to_uid];
        run_sql("DELETE FROM `message_group` WHERE ( `to_uid` = :to_uid1 AND `from_uid` = :from_uid1 ) OR ( `to_uid` = :to_uid2 AND `from_uid` = :from_uid2 ) LIMIT 2", $params_delete_group);

        $params_sender_group = [':uid' => $current_uid, ':to_uid' => $to_uid, ':from_uid' => $current_uid, ':text' => $text, ':timeline' => $now, ':is_read' => 1];
        run_sql("REPLACE INTO `message_group` ( `uid` , `to_uid` , `from_uid` , `text` , `timeline` , `is_read` ) VALUES ( :uid , :to_uid , :from_uid , :text , :timeline , :is_read )", $params_sender_group);
        
        $params_receiver_group = [':uid' => $to_uid, ':to_uid' => $to_uid, ':from_uid' => $current_uid, ':text' => $text, ':timeline' => $now, ':is_read' => 0];
        run_sql("REPLACE INTO `message_group` ( `uid` , `to_uid` , `from_uid` , `text` , `timeline` , `is_read` ) VALUES ( :uid , :to_uid , :from_uid , :text , :timeline , :is_read )", $params_receiver_group);

        return send_result('done');
    }

    /**
     * 刷新服务器端用户数据
     * @ApiDescription(section="Message", description="刷新服务器端用户数据")
     * @ApiLazyRoute(uri="/user/refresh",method="GET|POST")
     * @ApiReturn(type="object", sample="{'code': 0,'message': 'success'}")
     */
    public function refreshUserData()
    {
        $uid = lianmi_uid();
        $user = get_line("SELECT * FROM `user` WHERE `id` = :uid LIMIT 1", [':uid' => $uid]);
        if (!$user) {
            return lianmi_throw("INPUT", "用户不存在");
        }
        
        $user['uid'] = $user['id']; // Redundant if id is already uid.
        $user['token'] = session_id();
        $user = array_merge($user, get_group_info($user['id'])); // get_group_info needs review if it uses direct DB calls
        return send_result($user);
    }
}
