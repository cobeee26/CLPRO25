import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import axios from "axios"; // Removing manual axios import if not used elsewhere, wait, checking if used elsewhere. It is imported on line 3.
import { getClassPeople, ClassPeopleData, User } from '../services/authService';
import { FaUser, FaUserGraduate, FaChalkboardTeacher, FaArrowLeft, FaStream, FaTasks, FaUsers, FaEnvelope } from 'react-icons/fa';

/**
 * ClassDetailsPage
 * 
 * Main container for a specific class view.
 * Mimics Google Classroom with tabs: Stream, Classwork, People.
 */



const ClassDetailsPage: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people'>('people'); // Default to People for this task, or Stream usually
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [peopleData, setPeopleData] = useState<ClassPeopleData | null>(null);

    // Fetch People Data when tab is 'people'
    useEffect(() => {
        if (activeTab === 'people' && classId) {
            fetchPeopleData();
        } else if (classId) {
            // For now we might just need basic class info if on other tabs
            // But let's focus on People tab
            setLoading(false);
        }
    }, [classId, activeTab]);

    const fetchPeopleData = async () => {
        setLoading(true);
        try {
            const data = await getClassPeople(classId!);
            setPeopleData(data);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError('Failed to load class details. Access denied or class not found.');
        } finally {
            setLoading(false);
        }
    };

    const renderPeopleTab = () => {
        if (!peopleData) return null;

        return (
            <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-10">
                {/* Teachers Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b-[1px] border-emerald-500 pb-2">
                        <h2 className="text-3xl text-emerald-600 font-normal">Teachers</h2>
                    </div>
                    {peopleData.teacher ? (
                        <div className="flex items-center justify-between p-3 pl-4 hover:bg-gray-50 rounded-tr-lg rounded-tl-lg border-b border-gray-100 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 overflow-hidden">
                                    {peopleData.teacher.profile_picture_url ? (
                                        <img src={peopleData.teacher.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <FaChalkboardTeacher size={20} />
                                    )}
                                </div>
                                <span className="text-gray-900 font-medium text-base">
                                    {peopleData.teacher.first_name && peopleData.teacher.last_name
                                        ? `${peopleData.teacher.first_name} ${peopleData.teacher.last_name}`
                                        : peopleData.teacher.username}
                                </span>
                            </div>
                            <button className="text-gray-400 hover:text-emerald-600 p-2 rounded-full hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all" title="Email Teacher">
                                <FaEnvelope size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 text-gray-400 italic">No teacher assigned</div>
                    )}
                </div>

                {/* Classmates Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b-[1px] border-emerald-500 pb-2">
                        <h2 className="text-3xl text-emerald-600 font-normal">Classmates</h2>
                        <span className="text-emerald-600 font-medium text-sm">
                            {peopleData.student_count} students
                        </span>
                    </div>

                    <div className="flex flex-col">
                        {peopleData.students.length > 0 ? (
                            peopleData.students.map((student) => (
                                <div key={student.id} className="flex items-center justify-between p-3 pl-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white overflow-hidden">
                                            {student.profile_picture_url ? (
                                                <img src={student.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <FaUser size={18} />
                                            )}
                                        </div>
                                        <span className="text-gray-900 font-medium text-sm">
                                            {student.first_name && student.last_name
                                                ? `${student.first_name} ${student.last_name}`
                                                : student.username}
                                        </span>
                                    </div>
                                    <button className="text-gray-400 hover:text-emerald-600 p-2 rounded-full hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all" title="Email Student">
                                        <FaEnvelope size={18} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-lg border border-gray-200 border-dashed mt-4">
                                <FaUsers className="mx-auto mb-3 text-gray-300" size={40} />
                                <p className="text-lg font-medium text-gray-500">No students yet</p>
                                <p className="text-sm text-gray-400">Invite students to join this class</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderTabs = () => (
        <div className="flex items-center justify-start max-w-5xl mx-auto border-b border-gray-200 bg-white sticky top-0 z-10 px-6">
            <button
                onClick={() => setActiveTab('stream')}
                className={`px-6 py-4 font-medium text-sm transition-all border-b-[3px] rounded-t hover:bg-gray-50 ${activeTab === 'stream' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Stream
            </button>
            <button
                onClick={() => setActiveTab('classwork')}
                className={`px-6 py-4 font-medium text-sm transition-all border-b-[3px] rounded-t hover:bg-gray-50 ${activeTab === 'classwork' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Classwork
            </button>
            <button
                onClick={() => setActiveTab('people')}
                className={`px-6 py-4 font-medium text-sm transition-all border-b-[3px] rounded-t hover:bg-gray-50 ${activeTab === 'people' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                People
            </button>
        </div>
    );

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700 font-medium">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header / Nav */}
            <div className="bg-white px-6 py-4 flex items-center border-b border-gray-200">
                <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                    <FaArrowLeft />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        {peopleData ? peopleData.class_name : 'Loading Class...'}
                    </h1>
                    {peopleData && peopleData.class_section && (
                        <p className="text-sm text-gray-500">{peopleData.class_section}</p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            {renderTabs()}

            {/* Content Area */}
            <div className="max-w-5xl mx-auto pt-6 pb-20">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'stream' && (
                            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 border-dashed mx-4">
                                <FaStream className="mx-auto mb-4 text-emerald-200" size={48} />
                                <h3 className="text-lg font-medium text-gray-700">Stream coming soon</h3>
                                <p>Announcements and updates will appear here.</p>
                            </div>
                        )}
                        {activeTab === 'classwork' && (
                            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 border-dashed mx-4">
                                <FaTasks className="mx-auto mb-4 text-emerald-200" size={48} />
                                <h3 className="text-lg font-medium text-gray-700">Classwork coming soon</h3>
                                <p>Assignments and quizzes will be listed here.</p>
                            </div>
                        )}
                        {activeTab === 'people' && renderPeopleTab()}
                    </>
                )}
            </div>
        </div>
    );
};

export default ClassDetailsPage;
