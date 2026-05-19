import { connect } from 'react-redux';
import InfiniteSetupPage from '../../pages/InfiniteSetupPage';

function mapStateToProps(state) {
	return { currentUser: state.user.currentUser };
}
export default connect(mapStateToProps)(InfiniteSetupPage);