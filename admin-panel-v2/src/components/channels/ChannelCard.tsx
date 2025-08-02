import { Edit2, Trash2, MoreVertical, Clock, DollarSign, TruckIcon, Store, ShoppingBag, Globe, Car, Users, Smartphone, Building } from 'lucide-react';
import { useState } from 'react';
import { MenuChannel } from '../../types/channel';

interface ChannelCardProps {
  channel: MenuChannel;
  onEdit: (channel: MenuChannel) => void;
  onDelete: (channel: MenuChannel) => void;
  onToggleActive: (channel: MenuChannel) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getChannelIcon = () => {
    switch (channel.name) {
      case 'dine-in':
        return <Store className="h-6 w-6" />;
      case 'takeaway':
        return <ShoppingBag className="h-6 w-6" />;
      case 'delivery':
        return <TruckIcon className="h-6 w-6" />;
      case 'drive-thru':
        return <Car className="h-6 w-6" />;
      case 'catering':
        return <Users className="h-6 w-6" />;
      case 'online':
        return <Globe className="h-6 w-6" />;
      case 'mobile-app':
        return <Smartphone className="h-6 w-6" />;
      case 'third-party':
        return <Building className="h-6 w-6" />;
      default:
        return <Globe className="h-6 w-6" />;
    }
  };

  const isOpenNow = () => {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentDay = channel.operatingHours[dayOfWeek];
    
    if (!currentDay?.isOpen) return false;
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = currentDay.openTime.split(':').map(Number);
    const [closeHour, closeMin] = currentDay.closeTime.split(':').map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      channel.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              channel.isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {getChannelIcon()}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{channel.displayName}</h3>
              {channel.description && (
                <p className="text-sm text-gray-500 mt-1">{channel.description}</p>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    onClick={() => {
                      onEdit(channel);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleActive(channel);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {channel.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      onDelete(channel);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              channel.isActive ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">
              {channel.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {channel.isActive && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-gray-400" />
              <span className="text-sm text-gray-600">
                {isOpenNow() ? 'Open Now' : 'Closed'}
              </span>
            </div>
          )}
        </div>

        {/* Settings Summary */}
        <div className="space-y-2 mb-4">
          {channel.settings.minOrderAmount && channel.settings.minOrderAmount > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">Min Order:</span>
              <span className="ml-2">${channel.settings.minOrderAmount}</span>
            </div>
          )}
          
          {channel.settings.deliveryFee && channel.settings.deliveryFee > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">Delivery Fee:</span>
              <span className="ml-2">${channel.settings.deliveryFee}</span>
            </div>
          )}
          
          {channel.settings.packagingFee && channel.settings.packagingFee > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">Packaging Fee:</span>
              <span className="ml-2">${channel.settings.packagingFee}</span>
            </div>
          )}
          
          {channel.settings.estimatedTime && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">Est. Time:</span>
              <span className="ml-2">
                {channel.settings.estimatedTime.min}-{channel.settings.estimatedTime.max} mins
              </span>
            </div>
          )}
        </div>

        {/* Analytics */}
        {channel.analytics && channel.analytics.totalOrders > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{channel.analytics.totalOrders}</span> orders
            </div>
            <div className="flex items-center text-green-600">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">
                {channel.analytics.averageOrderValue?.toFixed(2) || '0.00'}
              </span>
              <span className="text-xs text-gray-500 ml-1">AOV</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelCard;