import { connect } from 'react-redux';
import ProfileComponent from '../../components/profile/ProfileComponent';

function lastRating(arr) {
	if (!Array.isArray(arr) || arr.length === 0) return null;
	const tail = arr[arr.length - 1];
	return Array.isArray(tail) ? tail[1] : null;
}

function mapStateToProps(state) {
	const user = state.user.profileUsers[state.user.selectedProfile];
	if (!user) return {};
	return {
		user,
		bulletRating: lastRating(user.bulletRatings),
		bulletRd: user.bulletRd,
		blitzRating: lastRating(user.blitzRatings),
		blitzRd: user.blitzRd,
		classicalRating: lastRating(user.classicalRatings),
		classicalRd: user.classicalRd,
	};
}

export default connect(mapStateToProps)(ProfileComponent);
