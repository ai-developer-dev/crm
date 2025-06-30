import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Users, Clock, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <p className="text-slate-600">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Active Calls</p>
                  <p className="text-2xl font-bold text-slate-800">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Users</p>
                  <p className="text-2xl font-bold text-slate-800">47</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Avg Call Time</p>
                  <p className="text-2xl font-bold text-slate-800">3:24</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-error/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-error" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Success Rate</p>
                  <p className="text-2xl font-bold text-slate-800">87%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Calls</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-800">+1 (555) 123-4567</p>
                      <p className="text-xs text-slate-500">2 minutes ago</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                    Completed
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-800">+1 (555) 987-6543</p>
                      <p className="text-xs text-slate-500">5 minutes ago</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error">
                    Missed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Active Users</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-slate-500 text-sm font-medium">SJ</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-800">Sarah Johnson</p>
                      <p className="text-xs text-slate-500">Ext: 1002</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                    Online
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-slate-500 text-sm font-medium">MD</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-800">Mike Davis</p>
                      <p className="text-xs text-slate-500">Ext: 1003</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                    Away
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
