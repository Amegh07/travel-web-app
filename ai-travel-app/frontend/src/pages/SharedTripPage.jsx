import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../services/api';

const SharedTripPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadTrip = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/trip/${id}`);
                if (!res.ok) {
                    throw new Error('Trip not found or expired.');
                }
                
                const data = await res.json();
                
                // 1. Save results to localStorage so ResultsPage & DayDetailPage can read it
                if (data.resultsData) {
                    localStorage.setItem('travex_results_cache', JSON.stringify(data.resultsData));
                }

                // 2. Save search data to sessionStorage so App.jsx boots into ResultsPage
                if (data.searchData) {
                    sessionStorage.setItem('travex_search', JSON.stringify(data.searchData));
                }

                // 3. Force a hard reload to trigger App.jsx's initial state load
                window.location.replace('/');
                
            } catch (err) {
                console.error(err);
                setError(err.message);
            }
        };

        loadTrip();
    }, [id]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F1EB] p-6">
                <div className="text-center p-8 bg-[#FDFCFA] rounded-3xl border border-[#E8E4DC] max-w-md w-full shadow-2xl">
                    <h2 className="serif-text text-3xl mb-4 text-[#1C1916]">Oops</h2>
                    <p className="text-[#9C9690] mb-8">{error}</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-[#1C1916] text-[#FDFCFA] rounded-xl font-bold uppercase tracking-widest text-[10px]"
                    >
                        Start New Search
                    </button>
                </div>
            </div>
        );
    }

    // Loading State
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F1EB]">
            <div className="w-12 h-12 border-4 border-[#B89A6A]/20 border-t-[#B89A6A] rounded-full animate-spin mb-6" />
            <h2 className="serif-text text-2xl animate-pulse text-[#1C1916]">Loading your shared trip...</h2>
        </div>
    );
};

export default SharedTripPage;
