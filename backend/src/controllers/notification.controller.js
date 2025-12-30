const Notification = require('../models/Notification.model');

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: notifications.length,
      data: { notifications }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
      isRead: false
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notifications.length,
      data: { notifications }
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    res.json({
      success: true,
      message: 'Đánh dấu đã đọc thành công',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'Đánh dấu tất cả đã đọc thành công'
    });
  } catch (error) {
    next(error);
  }
};



