function ProgressBar({ progress = 0, showLabel = true }) {
    const pct = Math.min(100, Math.max(0, Math.round(progress)));
    return (
        <div className="progress-bar-wrapper">
            {showLabel && (
                <div className="progress-bar-header">
                    <span className="field-label">Progress</span>
                    <span className="field-label">{pct}%</span>
                </div>
            )}
            <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default ProgressBar;
