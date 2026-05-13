import React, { useState } from 'react';
import OntologyGraph from './OntologyGraph';
import DoctorTimeline from './DoctorTimeline';
import { OntologyObject } from '../types';
import { Activity, X, Filter, Search, ZoomIn, ZoomOut, Maximize2, Building2, Package, Target, Users, Calendar, TrendingUp, AlertCircle, BarChart3, MapPin, Phone, Mail, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOntologyContext } from '../contexts/OntologyContext';

const ObjectDetailPanel: React.FC<{ selectedObject: OntologyObject }> = ({ selectedObject }) => {
  const renderHospitalDetail = (obj: OntologyObject) => {
    const props = obj.properties || {};
    const timeSeriesData = obj.timeSeries?.dataPoints || [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Building2 size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">医院等级</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.level || '三级甲等'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <MapPin size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">地址</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.address || '上海市'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Users size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">医生数</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.doctorCount || obj.links.filter(l => l.targetType === 'Doctor').length || 0}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">状态</span>
            </div>
            <div className={`text-sm font-medium ${obj.status === 'critical' ? 'text-rose-700' : obj.status === 'warning' ? 'text-amber-700' : 'text-emerald-400'}`}>
              {obj.status === 'critical' ? '危急' : obj.status === 'warning' ? '警告' : '正常'}
            </div>
          </div>
        </div>

        {timeSeriesData.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 size={16} className="text-gray-800" />
              <span className="text-xs font-bold text-gray-800 uppercase">时序数据</span>
            </div>
            <div className="space-y-2">
              {timeSeriesData.slice(-5).map((dp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-800">{new Date(dp.timestamp).toLocaleDateString('zh-CN')}</span>
                  <span className="font-medium text-gray-700">{dp.value?.toFixed?.(0) || dp.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-bold text-gray-800 uppercase mb-2">关联关系 ({obj.links.length})</div>
          <div className="space-y-1">
            {obj.links.slice(0, 5).map((link, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-600">{link.linkType}</span>
                <span className="text-gray-800">{link.targetName || link.targetId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProductDetail = (obj: OntologyObject) => {
    const props = obj.properties || {};
    const timeSeriesData = obj.timeSeries?.dataPoints || [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Package size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">产品类型</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.type || obj.properties.category || '处方药'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">生命周期</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{obj.lifecycleStage || '成熟期'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">销售额</span>
            </div>
            <div className="text-sm font-medium text-gray-700">¥{props.salesVolume || props.revenue || '0'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircle size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">状态</span>
            </div>
            <div className={`text-sm font-medium ${obj.status === 'critical' ? 'text-rose-700' : obj.status === 'warning' ? 'text-amber-700' : 'text-emerald-400'}`}>
              {obj.status === 'critical' ? '危急' : obj.status === 'warning' ? '警告' : '正常'}
            </div>
          </div>
        </div>

        {timeSeriesData.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 size={16} className="text-gray-800" />
              <span className="text-xs font-bold text-gray-800 uppercase">销售趋势</span>
            </div>
            <div className="space-y-2">
              {timeSeriesData.slice(-5).map((dp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-800">{new Date(dp.timestamp).toLocaleDateString('zh-CN')}</span>
                  <span className="font-medium text-gray-700">{dp.value?.toFixed?.(0) || dp.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-bold text-gray-800 uppercase mb-2">关联关系 ({obj.links.length})</div>
          <div className="space-y-1">
            {obj.links.slice(0, 5).map((link, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-600">{link.linkType}</span>
                <span className="text-gray-800">{link.targetName || link.targetId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSalesTargetDetail = (obj: OntologyObject) => {
    const props = obj.properties || {};
    const timeSeriesData = obj.timeSeries?.dataPoints || [];
    const achievementRate = props.achievementRate || props.currentValue / props.targetValue * 100 || 0;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Target size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">目标金额</span>
            </div>
            <div className="text-sm font-medium text-gray-700">¥{props.targetValue?.toLocaleString() || '1,000,000'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">当前完成</span>
            </div>
            <div className="text-sm font-medium text-gray-700">¥{props.currentValue?.toLocaleString() || '833,000'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">达成率</span>
            </div>
            <div className={`text-sm font-bold ${achievementRate >= 100 ? 'text-emerald-400' : achievementRate >= 80 ? 'text-amber-700' : 'text-rose-700'}`}>
              {achievementRate.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Calendar size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">周期</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.period || 'Q1 2026'}</div>
          </div>
        </div>

        {timeSeriesData.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 size={16} className="text-gray-800" />
              <span className="text-xs font-bold text-gray-800 uppercase">完成进度</span>
            </div>
            <div className="space-y-2">
              {timeSeriesData.slice(-5).map((dp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-800">{new Date(dp.timestamp).toLocaleDateString('zh-CN')}</span>
                  <span className="font-medium text-gray-700">{dp.value?.toFixed?.(0) || dp.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-bold text-gray-800 uppercase mb-2">关联关系 ({obj.links.length})</div>
          <div className="space-y-1">
            {obj.links.slice(0, 5).map((link, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-600">{link.linkType}</span>
                <span className="text-gray-800">{link.targetName || link.targetId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSalesRepDetail = (obj: OntologyObject) => {
    const props = obj.properties || {};
    const timeSeriesData = obj.timeSeries?.dataPoints || [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <User size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">职位</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.position || '销售代表'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <MapPin size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">负责区域</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.territory || props.region || '未分配'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Phone size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">电话</span>
            </div>
            <div className="text-sm font-medium text-gray-700">{props.phone || '未设置'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              <Mail size={14} className="text-gray-800" />
              <span className="text-xs text-gray-800">邮箱</span>
            </div>
            <div className="text-sm font-medium text-gray-700 truncate">{props.email || '未设置'}</div>
          </div>
        </div>

        {timeSeriesData.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 size={16} className="text-gray-800" />
              <span className="text-xs font-bold text-gray-800 uppercase">业绩趋势</span>
            </div>
            <div className="space-y-2">
              {timeSeriesData.slice(-5).map((dp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-800">{new Date(dp.timestamp).toLocaleDateString('zh-CN')}</span>
                  <span className="font-medium text-gray-700">{dp.value?.toFixed?.(0) || dp.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-bold text-gray-800 uppercase mb-2">关联关系 ({obj.links.length})</div>
          <div className="space-y-1">
            {obj.links.slice(0, 5).map((link, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-gray-600">{link.linkType}</span>
                <span className="text-gray-800">{link.targetName || link.targetId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  switch (selectedObject.objectType) {
    case 'Doctor':
      return <DoctorTimeline doctorId={selectedObject.id} />;
    case 'Hospital':
      return renderHospitalDetail(selectedObject);
    case 'Product':
      return renderProductDetail(selectedObject);
    case 'SalesTarget':
      return renderSalesTargetDetail(selectedObject);
    case 'SalesRep':
      return renderSalesRepDetail(selectedObject);
    default:
      return (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-bold text-gray-800 uppercase mb-2">基本信息</div>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">类型: {selectedObject.objectType}</div>
            <div className="text-sm text-gray-600">状态: {selectedObject.status || 'normal'}</div>
            {selectedObject.lifecycleStage && (
              <div className="text-sm text-gray-600">生命周期: {selectedObject.lifecycleStage}</div>
            )}
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-gray-800 uppercase mb-2">关联关系 ({selectedObject.links.length})</div>
            <div className="space-y-1">
              {selectedObject.links.slice(0, 5).map((link, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-gray-100">
                  <span className="text-gray-600">{link.linkType}</span>
                  <span className="text-gray-800">{link.targetName || link.targetId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
  }
};

const OntologyGraphView: React.FC = () => {
  const [selectedObject, setSelectedObject] = useState<OntologyObject | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const { state } = useOntologyContext();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const graphContainerRef = React.useRef<HTMLDivElement>(null);

  const handleNodeClick = (node: OntologyObject) => {
    setSelectedObject(node);
    setShowTimeline(true);
  };

  const handleCloseTimeline = () => {
    setShowTimeline(false);
  };

  const filteredObjects = React.useMemo(() => {
    let result = state.objects;
    if (filterType !== 'all') {
      result = result.filter(o => o.objectType === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.objectType.toLowerCase().includes(q) ||
        (o.properties && Object.values(o.properties).some(v => String(v).toLowerCase().includes(q)))
      );
    }
    return result;
  }, [state.objects, filterType, searchQuery]);

  const objectTypes = React.useMemo(() => {
    const types = new Set(state.objects.map(o => o.objectType));
    return Array.from(types).sort();
  }, [state.objects]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleFullscreen = () => {
    if (graphContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        graphContainerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex h-full">
      <div className={`flex-1 transition-all duration-300 ${showTimeline ? 'w-2/3' : 'w-full'}`}>
        <div className="h-full flex flex-col">
          <div className="bg-white backdrop-blur-xl border-b border-gray-100 p-5 z-10 sticky top-0 shadow-lg shadow-black/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <div className="p-2 bg-brand-500/15 rounded-xl mr-3 ring-1 ring-brand-500/20">
                    <Activity className="text-brand-400" size={20} />
                  </div>
                  知识图谱
                </h2>
                {selectedObject && (
                  <div className="text-sm text-gray-800 bg-gray-50/60 px-3 py-1.5 rounded-full border border-gray-100 flex items-center backdrop-blur-sm">
                    <span className="mr-2">选中:</span>
                    <span className="font-semibold text-gray-600">{selectedObject.name}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 bg-gray-50/60 p-1.5 rounded-xl border border-gray-100 backdrop-blur-sm">
                <button
                  onClick={() => { setShowSearch(!showSearch); setShowFilter(false); }}
                  className={`p-2 rounded-lg transition-all duration-300 ${showSearch ? 'text-brand-400 bg-white/10 shadow-sm' : 'text-gray-800 hover:text-brand-400 hover:bg-white/10 hover:shadow-sm'}`}
                  title="搜索"
                >
                  <Search size={18} />
                </button>
                <div className="w-px h-4 bg-white/15 mx-1"></div>
                <div className="relative">
                  <button
                    onClick={() => { setShowFilter(!showFilter); setShowSearch(false); }}
                    className={`p-2 rounded-lg transition-all duration-300 ${showFilter ? 'text-brand-400 bg-white/10 shadow-sm' : 'text-gray-800 hover:text-brand-400 hover:bg-white/10 hover:shadow-sm'}`}
                    title="筛选"
                  >
                    <Filter size={18} />
                  </button>
                  {showFilter && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                      <div className="p-2">
                        <button
                          onClick={() => { setFilterType('all'); setShowFilter(false); }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${filterType === 'all' ? 'bg-brand-500/10 text-brand-400 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          全部类型
                        </button>
                        {objectTypes.map(type => (
                          <button
                            key={type}
                            onClick={() => { setFilterType(type); setShowFilter(false); }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${filterType === type ? 'bg-brand-500/10 text-brand-400 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-px h-4 bg-white/15 mx-1"></div>
                <button onClick={handleZoomIn} className="p-2 text-gray-800 hover:text-brand-400 hover:bg-white/10 hover:shadow-sm rounded-lg transition-all duration-300" title="放大">
                  <ZoomIn size={18} />
                </button>
                <button onClick={handleZoomOut} className="p-2 text-gray-800 hover:text-brand-400 hover:bg-white/10 hover:shadow-sm rounded-lg transition-all duration-300" title="缩小">
                  <ZoomOut size={18} />
                </button>
                <span className="text-xs text-gray-700 min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
                <div className="w-px h-4 bg-white/15 mx-1"></div>
                <button onClick={handleFullscreen} className="p-2 text-gray-800 hover:text-brand-400 hover:bg-white/10 hover:shadow-sm rounded-lg transition-all duration-300" title="全屏">
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex items-center text-xs text-gray-800 bg-brand-500/10 p-2.5 rounded-lg border border-brand-500/25 shadow-glow">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-pulse"></div>
              点击图谱中的节点查看详细信息和时间轴
            </div>
            
            {showSearch && (
              <div className="mt-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索节点名称、类型或属性..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-1 text-xs text-gray-800">
                    找到 {filteredObjects.length} 个匹配节点
                    {filterType !== 'all' && ` (筛选: ${filterType})`}
                  </div>
                )}
              </div>
            )}
            
            {(filterType !== 'all' || searchQuery) && !showSearch && (
              <div className="mt-3 flex items-center gap-2">
                {filterType !== 'all' && (
                  <span className="text-xs px-2 py-1 bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/20 flex items-center gap-1">
                    筛选: {filterType}
                    <button onClick={() => setFilterType('all')} className="hover:text-brand-600">
                      <X size={10} />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-200 flex items-center gap-1">
                    搜索: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-800">
                      <X size={10} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 bg-gray-50/30 p-6 overflow-hidden" ref={graphContainerRef}>
            <div className="w-full h-full bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden backdrop-blur-sm" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}>
              <OntologyGraph objects={filteredObjects} onNodeClick={handleNodeClick} />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTimeline && selectedObject && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '33.333%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border-l border-gray-100 overflow-hidden backdrop-blur-xl shadow-2xl shadow-black/5"
          >
            <div className="h-full flex flex-col">
              <div className="bg-white border-b border-gray-100 p-5 sticky top-0 z-10 shadow-md shadow-black/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {selectedObject.name}
                    </h3>
                    <div className="flex items-center text-xs font-medium text-gray-800 space-x-2">
                      <span className="bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-md border border-brand-500/25 font-medium">{selectedObject.objectType}</span>
                      <span className="text-gray-600">•</span>
                      <span className="font-mono text-gray-800">{selectedObject.id}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseTimeline}
                    className="p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
                    title="关闭时间轴"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 bg-gray-50/30">
                <ObjectDetailPanel selectedObject={selectedObject} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OntologyGraphView;