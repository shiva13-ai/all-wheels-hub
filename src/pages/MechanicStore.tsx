import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, PlusCircle, ShoppingCart, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storeService, Product } from '@/services/supabase/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// --- Sub-Component: Product Form Modal ---

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    onProductSaved: () => void;
    currentProduct?: Product;
    mechanicId: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onProductSaved, currentProduct, mechanicId }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        title: currentProduct?.title || '',
        description: currentProduct?.description || '',
        price: currentProduct?.price || '', // Price in major units (Rupees/Dollars)
        stock: currentProduct?.stock || '',
        category: currentProduct?.category || 'Oil & Fluids',
        imageFile: null as File | null,
    });
    const [imagePreview, setImagePreview] = useState<string | null>(currentProduct?.image_url || null);

    const isEditing = !!currentProduct;

    useEffect(() => {
        // Reset form or set initial data when opening/changing product
        setFormData({
            title: currentProduct?.title || '',
            description: currentProduct?.description || '',
            price: currentProduct?.price || '',
            stock: currentProduct?.stock || '',
            category: currentProduct?.category || 'Oil & Fluids',
            imageFile: null,
        });
        setImagePreview(currentProduct?.image_url || null);
    }, [currentProduct, isOpen]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Max size is 5MB', variant: 'destructive' });
            return;
        }

        setFormData(prev => ({ ...prev, imageFile: file }));
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const uploadProductImage = async (file: File): Promise<string | null> => {
        if (!file) return null; // Defensive check

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${mechanicId}/${currentProduct?.id || Date.now()}.${fileExt}`;

            // Check if file content changed (only upload new file or if no current URL exists)
            if (isEditing && !formData.imageFile) {
                return currentProduct?.image_url || null; // Use existing URL if no new file is selected
            }

            const { data, error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            return publicUrlData.publicUrl;

        } catch (error: any) {
            toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const priceInMinorUnits = Math.round(Number(formData.price) * 100);

        if (priceInMinorUnits <= 0) {
            toast({ title: 'Validation Error', description: 'Price must be greater than zero.', variant: 'destructive' });
            setLoading(false);
            return;
        }
        
        // Ensure that for new products, a file is selected
        if (!isEditing && !formData.imageFile) {
            toast({ title: 'Validation Error', description: 'Please select an image for your new product.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        try {
            let imageUrl = currentProduct?.image_url || null;
            
            // Only upload if a new file is selected or if it's a new product
            if (formData.imageFile || !imageUrl) {
                 // Upload product image (we trust formData.imageFile now has a file if !isEditing)
                imageUrl = await uploadProductImage(formData.imageFile || new File([], 'placeholder.png'));
                if (imageUrl === null && (formData.imageFile || !isEditing)) {
                    // If upload failed and it's a new product or we tried to upload a new image
                    throw new Error("Image upload failed.");
                }
            }


            const productData = {
                title: formData.title,
                description: formData.description,
                price: priceInMinorUnits, // Save price in cents/paise
                stock: Number(formData.stock),
                category: formData.category,
                image_url: imageUrl,
                mechanic_id: mechanicId,
                active: true, // Always default to active when creating/editing
            };

            const { error } = isEditing
                ? await supabase.from('products').update(productData).eq('id', currentProduct.id).select()
                : await supabase.from('products').insert(productData).select();

            if (error) throw error;

            toast({
                title: isEditing ? 'Product Updated' : 'Product Created',
                description: `${formData.title} has been successfully saved.`,
            });
            onProductSaved();
            onClose();

        } catch (error: any) {
            toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const PRODUCTS_CATEGORIES = ['Oil & Fluids', 'Brakes', 'Tires', 'Electrical', 'Accessories', 'Tools'];


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <CardDescription>
                        {isEditing ? 'Update the details for your listing.' : 'Create a new item listing for your store.'}
                    </CardDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>Product Image *</Label>
                        <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Product preview" className="h-full w-full object-contain rounded-lg" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    Click to upload (Max 5MB)
                                </div>
                            )}
                            <Input
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (INR/USD) *</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock">Stock *</Label>
                            <Input
                                id="stock"
                                type="number"
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select 
                            value={formData.category} 
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {PRODUCTS_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || uploading}>
                            {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uploading ? 'Uploading...' : (isEditing ? 'Save Changes' : 'Add Product')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};


// --- Main Component: Mechanic Store ---

const MechanicStore: React.FC = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    
    // Safety check: ensure component does not crash if profile/user is null before redirects kick in
    const mechanicId = profile?.user_id;

    const fetchProducts = async () => {
        if (!mechanicId) return;
        setLoading(true);
        try {
            const { data, error } = await storeService.getMechanicProducts(mechanicId);
            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            console.error("Failed to fetch mechanic products:", error);
            toast({
                title: "Error",
                description: "Failed to load your store products.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    
    // Initial fetch and subscribe to changes
    useEffect(() => {
        if (mechanicId) {
            fetchProducts();
            
            // Optional: Subscribe to real-time changes if needed for instant updates
            // const channel = supabase.channel(`products:mechanic_${mechanicId}`)
            //     .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `mechanic_id=eq.${mechanicId}` }, () => {
            //         fetchProducts();
            //     }).subscribe();
            
            // return () => { supabase.removeChannel(channel); };
        }
    }, [mechanicId]);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (productId: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete product: "${title}"?`)) {
            try {
                const { error } = await storeService.deleteProduct(productId);
                if (error) throw error;
                toast({ title: "Deleted", description: `${title} has been successfully removed.` });
                fetchProducts();
            } catch (error: any) {
                toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
            }
        }
    };
    
    const handleAddClick = () => {
        setEditingProduct(undefined);
        setIsModalOpen(true);
    };

    // --- Loading/Error/Access State ---
    if (loading || !user || !mechanicId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // Ensure only mechanics or admins can see this page (Protected Route handles full redirect)
    if (profile?.role !== 'mechanic' && profile?.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 text-center">
                <p className="text-destructive">Access Denied. Only mechanics can access this page.</p>
            </div>
        );
    }
    
    // --- Render Dashboard ---
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-8 mt-20">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Your Store Inventory</h1>
                    <Button onClick={handleAddClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Product
                    </Button>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-lg">Dashboard Summary</CardTitle>
                        <CardDescription>
                            Manage your product listings. Listings marked **Active** will appear in the main customer store.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                             <div className="text-center p-4 border rounded-lg bg-secondary">
                                <div className="text-2xl font-bold">{products.length}</div>
                                <p className="text-sm text-muted-foreground">Total Listings</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {products.filter(p => p.active).length}
                                </div>
                                <p className="text-sm text-muted-foreground">Active</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {products.filter(p => p.stock === 0).length}
                                </div>
                                <p className="text-sm text-muted-foreground">Out of Stock</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Product List */}
                <ScrollArea className="h-[calc(100vh-400px)] border rounded-lg">
                    {products.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <ShoppingCart className="w-10 h-10 mx-auto mb-4" />
                            <p className="text-lg">No products listed yet.</p>
                            <p>Click "Add New Product" to get started!</p>
                        </div>
                    ) : (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(product => (
                                <Card key={product.id} className="relative">
                                    <CardHeader className="pb-2 flex-row items-start space-y-0">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{product.title}</CardTitle>
                                            <CardDescription>{product.category}</CardDescription>
                                        </div>
                                        <Badge variant={product.active ? 'default' : 'destructive'}>
                                            {product.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                         <img 
                                            src={product.image_url || 'https://placehold.co/400x300/e0e0e0/555555?text=No+Image'} 
                                            alt={product.title} 
                                            className="w-full h-32 object-cover rounded-md mb-2"
                                        />
                                        <p className="text-xl font-bold">₹{product.price.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                                        <div className="flex gap-2 mt-3">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="flex-1"
                                                onClick={() => handleEdit(product)}
                                            >
                                                <Edit className="w-4 h-4 mr-2" /> Edit
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                className="w-1/3"
                                                onClick={() => handleDelete(product.id, product.title)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
            <Footer />

            <ProductForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onProductSaved={fetchProducts}
                currentProduct={editingProduct}
                mechanicId={mechanicId}
            />
        </div>
    );
};

export default MechanicStore;
