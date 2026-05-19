import { connect } from 'react-redux';
import InfiniteGamePage from '../../pages/InfiniteGamePage';

function mapStateToProps(state) {
	return { currentUser: state.user.currentUser };
}
export default connect(mapStateToProps)(InfiniteGamePage);