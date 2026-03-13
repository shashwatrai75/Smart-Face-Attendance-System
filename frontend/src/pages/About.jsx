import { Link } from 'react-router-dom';

const About = () => {
  const technologies = [
    'React (Vite)',
    'Node.js & Express',
    'MongoDB',
    'face-api.js',
    'TensorFlow.js',
    'JWT Authentication',
    'Tailwind CSS',
    'IndexedDB',
  ];

  const features = [
    {
      title: 'Real-time Face Recognition',
      icon: '👤',
      description: 'Instant face detection and matching during attendance.',
    },
    {
      title: 'Liveness Detection',
      icon: '🛡️',
      description: 'Challenge-based verification to prevent spoofing.',
    },
    {
      title: 'Duplicate Enrollment Detection',
      icon: '🔍',
      description: 'Prevents multiple enrollments with same face.',
    },
    {
      title: 'Role-Based Access',
      icon: '🔐',
      description: 'Office Admin, Lecturer, and Viewer roles with granular permissions.',
    },
    {
      title: 'Calendar & Analytics',
      icon: '📊',
      description: 'Visual calendar and detailed attendance reports.',
    },
    {
      title: 'Hybrid Mode',
      icon: '🏢',
      description: 'Supports both Class and Department sections.',
    },
  ];

  const futureEnhancements = [
    'Advanced anti-spoof AI model',
    'Mobile app version',
    'Enterprise scaling',
    'Multi-branch support',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Section 1 - Hero */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            SmartFace Attendance System
          </h1>
          <p className="text-xl text-blue-100 dark:text-slate-300">
            AI-Powered Secure Attendance Platform
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </section>

      {/* Section 2 - Creator Info */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Created By</h2>
            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">Shashwat Rai</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">BSc (Hons) Computing Student</p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              SmartFace Attendance System is a Final Year Project built to provide secure and scalable attendance management using face recognition, liveness detection, geo-restriction, and role-based access control. The system eliminates manual processes while ensuring high accuracy and fraud prevention.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 - Project Vision */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Project Vision</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Our mission is to eliminate proxy attendance, improve security, and provide real-time analytics for attendance data. SmartFace supports Class and Department sections with session-based or check-in/check-out attendance, enabling institutions to adopt a modern, touchless attendance solution that scales with their needs.
          </p>
        </div>
      </section>

      {/* Section 4 - Technologies Used */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8">Technologies Used</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {technologies.map((tech) => (
              <div
                key={tech}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow text-center"
              >
                <span className="font-medium text-slate-800 dark:text-slate-200">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 - Key Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8">Key Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 - Future Enhancements */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Future Enhancements</h2>
          <ul className="space-y-3">
            {futureEnhancements.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-slate-600 dark:text-slate-300"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
