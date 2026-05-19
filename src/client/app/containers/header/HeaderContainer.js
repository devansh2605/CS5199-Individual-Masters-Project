import { connect } from 'react-redux';
import _ from 'lodash';
import { updateCurrentUser } from '../../actions/user';
import HeaderComponent from '../../components/header/HeaderComponent';

function mapStateToProps(state) {
	const cu = state.user.currentUser;
	return {
		isLoggedIn: !_.isEmpty(cu),
		username: !_.isEmpty(cu) ? cu.username : '',
		currentUser: cu,
	};
}

function mapDispatchToProps(dispatch) {
	return {
		updateCurrentUser: user => dispatch(updateCurrentUser(user)),
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(HeaderComponent);
