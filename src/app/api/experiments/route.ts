import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classLevel = searchParams.get('class');
  const subject = searchParams.get('subject');

  const experiments = [
    { id: 'projectile-motion', title: 'Projectile Motion', class_level: 11, subject: 'physics', youtube_video_id: 'abc123', has_simulation: true },
    { id: 'ohms-law', title: "Ohm's Law", class_level: 10, subject: 'physics', youtube_video_id: 'def456', has_simulation: true },
    { id: 'pendulum', title: 'Simple Pendulum', class_level: 11, subject: 'physics', youtube_video_id: 'ghi789', has_simulation: true },
    { id: 'heat-transfer', title: 'Heat Transfer', class_level: 7, subject: 'physics', youtube_video_id: 'jkl012', has_simulation: true },
    { id: 'friction', title: 'Friction', class_level: 8, subject: 'physics', youtube_video_id: 'mno345', has_simulation: true },
    { id: 'motion', title: 'Motion', class_level: 9, subject: 'physics', youtube_video_id: 'pqr678', has_simulation: true },
    { id: 'lens', title: 'Focal Length of Lens', class_level: 10, subject: 'physics', youtube_video_id: 'stu901', has_simulation: true },
    { id: 'meter-bridge', title: 'Meter Bridge', class_level: 12, subject: 'physics', youtube_video_id: 'vwx234', has_simulation: true },
    { id: 'separating-mixtures', title: 'Separation of Mixtures', class_level: 6, subject: 'chemistry', youtube_video_id: 'yza567', has_simulation: true },
    { id: 'acid-base', title: 'Acids and Bases', class_level: 7, subject: 'chemistry', youtube_video_id: 'bcd890', has_simulation: true },
    { id: 'combustion', title: 'Combustion', class_level: 8, subject: 'chemistry', youtube_video_id: 'efg123', has_simulation: true },
    { id: 'chemical-reactions', title: 'Chemical Reactions', class_level: 10, subject: 'chemistry', youtube_video_id: 'hij456', has_simulation: true },
    { id: 'titration', title: 'Titration', class_level: 11, subject: 'chemistry', youtube_video_id: 'klm789', has_simulation: true },
    { id: 'electrolysis', title: 'Electrolysis', class_level: 12, subject: 'chemistry', youtube_video_id: 'nop012', has_simulation: true },
    { id: 'plant-observation', title: 'Types of Plants', class_level: 6, subject: 'biology', youtube_video_id: 'qrs345', has_simulation: true },
    { id: 'cell-structure', title: 'Cell Structure', class_level: 8, subject: 'biology', youtube_video_id: 'tuv678', has_simulation: true },
    { id: 'cell-division', title: 'Cell Division', class_level: 9, subject: 'biology', youtube_video_id: 'wxy901', has_simulation: true },
    { id: 'inheritance', title: 'Heredity', class_level: 10, subject: 'biology', youtube_video_id: 'zab234', has_simulation: true },
    { id: 'dna-extraction', title: 'DNA Extraction', class_level: 12, subject: 'biology', youtube_video_id: 'cde567', has_simulation: true },
    { id: 'algebra', title: 'Algebra', class_level: 9, subject: 'mathematics', youtube_video_id: 'fgh890', has_simulation: true },
    { id: 'quadratic-roots', title: 'Quadratic Equation', class_level: 10, subject: 'mathematics', youtube_video_id: 'ijk123', has_simulation: true },
    { id: 'calculus', title: 'Calculus', class_level: 11, subject: 'mathematics', youtube_video_id: 'lmn456', has_simulation: true },
    { id: 'trigonometry', title: 'Trigonometry', class_level: 10, subject: 'mathematics', youtube_video_id: 'opq789', has_simulation: true },
  ];

  let filtered = experiments;
  if (classLevel) {
    filtered = filtered.filter(e => e.class_level === parseInt(classLevel));
  }
  if (subject) {
    filtered = filtered.filter(e => e.subject === subject);
  }

  return NextResponse.json({ experiments: filtered });
}
