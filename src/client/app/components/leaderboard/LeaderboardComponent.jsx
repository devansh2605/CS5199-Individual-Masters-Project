import React from 'react';
import HeaderContainer from '../../containers/header/HeaderContainer';
import UserListComponent from './UserListComponent';

export default class LeaderboardComponent extends React.Component {
	componentWillMount() {
		this.props.fetchLeaderboard();
	}

	render() {
		return (
			<div className="bg-bg-base min-h-screen">
				<HeaderContainer />
				<div className="px-6 py-8 max-w-3xl mx-auto">
					<h1 className="text-text-main text-2xl font-bold mb-6">Leaderboard</h1>
					<UserListComponent data={this.props.bullet || []} />
				</div>
			</div>
		);
	}
}
