export const SEND_NOTIFICATION = 'SEND_NOTIFICATION';
export const CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS';
export const UPDATE_RESET_TOKEN = 'UPDATE_RESET_TOKEN';

// dispatches a toast notification action with { message, level, position, autoDismiss }
export function sendNotification(notification) {
	return { type: SEND_NOTIFICATION, notification };
}

export function clearNotifications() {
	return { type: CLEAR_NOTIFICATIONS };
}

export function updateResetToken(resetToken) {
	return { type: UPDATE_RESET_TOKEN, resetToken };
}
