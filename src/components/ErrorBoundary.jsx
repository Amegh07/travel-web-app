import React from 'react';
import { RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error) {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		this.setState({
			error,
			errorInfo,
		});
		console.error('Error Boundary caught:', error, errorInfo);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center min-h-screen bg-red-50">
					<div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
						<h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
						<p className="text-gray-700 mb-4">An unexpected error occurred. Please try refreshing the page.</p>
						{this.state.error && (
							<details className="mb-4 text-sm text-gray-600">
								<summary className="cursor-pointer font-semibold">Error details</summary>
								<pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">{this.state.error.toString()}</pre>
							</details>
						)}
						<button
							onClick={this.handleReset}
							className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
						>
							<RefreshCw size={18} />
							Try again
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
