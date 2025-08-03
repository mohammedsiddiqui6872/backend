import { useState } from 'react';
import { ShoppingBag, Monitor } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import OrdersManagement from '../components/orders/OrdersManagement';
import KitchenDisplay from '../components/orders/KitchenDisplay';

const Orders = () => {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Orders & Kitchen</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage orders and kitchen operations in real-time
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Orders Management
          </TabsTrigger>
          <TabsTrigger value="kitchen" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Kitchen Display
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <OrdersManagement />
        </TabsContent>

        <TabsContent value="kitchen" className="mt-6">
          <KitchenDisplay />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;