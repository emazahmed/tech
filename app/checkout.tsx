import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, MapPin, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp, getCartTotal } from '@/context/AppContext';
import Header from '@/components/Header';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { addressService, Address } from '@/services/addressesService';
import { orderService, CreateOrderData } from '@/services/orderService';
import { cartService } from '@/services/cartService';

interface FormData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Shipping Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Payment Info
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardName: string;
}

export default function CheckoutScreen() {
  const { state, dispatch } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidatingCart, setIsValidatingCart] = useState(true);
  const [cartValidationError, setCartValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: state.user?.name?.split(' ')[0] || '',
    lastName: state.user?.name?.split(' ')[1] || '',
    email: state.user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const steps = [
    { title: 'Personal Info', icon: User },
    { title: 'Shipping', icon: MapPin },
    { title: 'Payment', icon: CreditCard },
  ];

  const cartTotal = getCartTotal(state.cart);
  const tax = cartTotal * 0.08;
  const shipping = cartTotal > 100 ? 0 : 9.99;
  const finalTotal = cartTotal + tax + shipping;

  useEffect(() => {
    validateCart();
  }, []);

  useEffect(() => {
    if (currentStep === 1) {
      loadAddresses();
    }
  }, [currentStep]);

  const validateCart = async () => {
    try {
      setIsValidatingCart(true);
      setCartValidationError(null);
      
      // Get fresh cart data from server
      const response = await cartService.getCart();
      
      if (!response.success) {
        setCartValidationError('Failed to load cart. Please try again.');
        return;
      }
      
      const cartItems = response.data?.cart || [];
      
      if (cartItems.length === 0) {
        setCartValidationError('Your cart is empty. Please add some items before checkout.');
        return;
      }
      
      // Check if all items are still available
      const unavailableItems = cartItems.filter(item => !item.product?.inStock);
      if (unavailableItems.length > 0) {
        setCartValidationError(`Some items in your cart are no longer available: ${unavailableItems.map(item => item.product?.name).join(', ')}`);
        return;
      }
      
    } catch (error) {
      console.error('Cart validation error:', error);
      setCartValidationError('Failed to validate cart. Please try again.');
    } finally {
      setIsValidatingCart(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const response = await addressService.getAddresses();
      
      if (response.success && response.data?.addresses) {
        setAddresses(response.data.addresses);
        // Auto-select default address
        const defaultAddress = response.data.addresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          // Pre-fill form with default address
          setFormData(prev => ({
            ...prev,
            address: defaultAddress.address,
            city: defaultAddress.city,
            state: defaultAddress.state,
            zipCode: defaultAddress.zipCode,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddressId(address.id);
    setFormData(prev => ({
      ...prev,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    }));
    setShowAddressForm(false);
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};

    switch (step) {
      case 0: // Personal Info
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;

      case 1: // Shipping
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
        break;

      case 2: // Payment
        if (!formData.cardNumber.trim()) newErrors.cardNumber = 'Card number is required';
        else if (formData.cardNumber.replace(/\s/g, '').length < 16) newErrors.cardNumber = 'Invalid card number';
        if (!formData.expiryDate.trim()) newErrors.expiryDate = 'Expiry date is required';
        else {
          // Validate MM/YY format
          const match = formData.expiryDate.match(/^(\d{2})\/(\d{2})$/);
          if (!match) {
            newErrors.expiryDate = 'Invalid format (MM/YY)';
          } else {
            const month = parseInt(match[1], 10);
            const year = parseInt(match[2], 10) + 2000; // assumes 20YY
            const now = new Date();
            const expiry = new Date(year, month - 1, 1);
            // Check month range
            if (month < 1 || month > 12) {
              newErrors.expiryDate = 'Invalid month';
            } else if (
              expiry.getFullYear() < now.getFullYear() ||
              (expiry.getFullYear() === now.getFullYear() && month < now.getMonth() + 1)
            ) {
              newErrors.expiryDate = 'Card expired';
            }
          }
        }
        if (!formData.cvv.trim()) newErrors.cvv = 'CVV is required';
        else if (formData.cvv.length < 3) newErrors.cvv = 'Invalid CVV';
        if (!formData.cardName.trim()) newErrors.cardName = 'Cardholder name is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handlePlaceOrder();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ').substr(0, 19) : digits;
  };

  const formatExpiryDate = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 2) {
      return `${digits.substr(0, 2)}/${digits.substr(2, 2)}`;
    }
    return digits;
  };

const handlePlaceOrder = async () => {
  setIsProcessing(true);
  
  try {
    // Validate cart one more time before placing order
    const cartResponse = await cartService.getCart();
    
    if (!cartResponse.success || !cartResponse.data?.cart || cartResponse.data.cart.length === 0) {
      Alert.alert(
        'Cart Empty', 
        'Your cart is empty. Please add some items before checkout.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    
    // Include cart items in the order data
    const orderData = {
      shippingAddress: {
        name: `${formData.firstName} ${formData.lastName}`,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: 'United States',
        phone: formData.phone,
      },
      paymentInfo: {
        method: "credit_card" as "credit_card",
        transactionId: `TXN-${Date.now()}`,
        lastFour: formData.cardNumber.slice(-4),
      },
      notes: 'Order placed through mobile app',
      items: cartResponse.data.cart.map(cartItem => ({
        productId: cartItem.product._id || cartItem.product.id,
        name: cartItem.product.name,
        price: cartItem.priceAtAdd,
        quantity: cartItem.quantity,
        totalPrice: cartItem.totalPrice,
        variant: cartItem.variant || {},
        image: cartItem.product.image,
        brand: cartItem.product.brand,
        sku: cartItem.product.sku,
      })),
      pricing: {
        subtotal: cartResponse.data.summary?.subtotal ?? 0,
        tax: cartResponse.data.summary?.tax ?? 0,
        shipping: cartResponse.data.summary?.shipping ?? 0,
        total: cartResponse.data.summary?.total ?? 0,
        itemCount: cartResponse.data.summary?.itemCount ?? 0,
      }
    };
    
    const response = await orderService.createOrder(orderData);
    
    if (response.success && response.data?.order) {
      // Clear cart and add order to local state
      dispatch({ type: 'ADD_ORDER', payload: {
        id: response.data.order.id,
        date: response.data.order.createdAt,
        total: response.data.order.pricing.total,
        status: (['pending', 'processing', 'shipped', 'delivered'] as const).includes(response.data.order.status as any)
          ? response.data.order.status as 'pending' | 'processing' | 'shipped' | 'delivered'
          : 'pending',
        items: state.cart,
      }});
      
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${response.data.order.orderNumber} has been placed and will be processed shortly.`,
        [
          {
            text: 'Continue Shopping',
            onPress: () => {
              router.dismissAll();
              router.push('/(tabs)');
            },
          },
        ]
      );
    } else {
      Alert.alert('Order Failed', response.message || 'Failed to place order. Please try again.');
    }
  } catch (error) {
    Alert.alert('Error', 'Network error. Please check your connection and try again.');
  } finally {
    setIsProcessing(false);
  }
};

  const renderPersonalInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      
      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            placeholder="Enter first name"
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>
        
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            placeholder="Enter last name"
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          value={formData.phone}
          onChangeText={(text) => updateFormData('phone', text)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>
    </View>
  );

  const renderShipping = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Shipping Address</Text>

      {/* Saved Addresses */}
      {isLoadingAddresses ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : addresses.length > 0 && !showAddressForm ? (
        <View style={styles.savedAddressesContainer}>
          <Text style={styles.savedAddressesTitle}>Choose from saved addresses:</Text>
          {addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.savedAddressCard,
                selectedAddressId === address.id && styles.selectedAddressCard
              ]}
              onPress={() => handleSelectAddress(address)}
            >
              <View style={styles.savedAddressHeader}>
                <Text style={styles.savedAddressLabel}>{address.label}</Text>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.savedAddressText}>
                {address.name}
              </Text>
              <Text style={styles.savedAddressText}>
                {address.address}, {address.city}, {address.state} {address.zipCode}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.useNewAddressButton}
            onPress={() => setShowAddressForm(true)}
          >
            <Text style={styles.useNewAddressText}>Use a different address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {addresses.length > 0 && (
            <TouchableOpacity
              style={styles.backToSavedButton}
              onPress={() => setShowAddressForm(false)}
            >
              <Text style={styles.backToSavedText}>← Back to saved addresses</Text>
            </TouchableOpacity>
          )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Street Address</Text>
        <TextInput
          style={[styles.input, errors.address && styles.inputError]}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          placeholder="Enter street address"
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={[styles.input, errors.city && styles.inputError]}
          value={formData.city}
          onChangeText={(text) => updateFormData('city', text)}
          placeholder="Enter city"
        />
        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={[styles.input, errors.state && styles.inputError]}
            value={formData.state}
            onChangeText={(text) => updateFormData('state', text)}
            placeholder="State"
          />
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>
        
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>ZIP Code</Text>
          <TextInput
            style={[styles.input, errors.zipCode && styles.inputError]}
            value={formData.zipCode}
            onChangeText={(text) => updateFormData('zipCode', text)}
            placeholder="ZIP"
            keyboardType="numeric"
          />
          {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
        </View>
      </View>
        </>
      )}
    </View>
  );

  const renderPayment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Payment Information</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={[styles.input, errors.cardNumber && styles.inputError]}
          value={formData.cardNumber}
          onChangeText={(text) => updateFormData('cardNumber', formatCardNumber(text))}
          placeholder="1234 5678 9012 3456"
          keyboardType="numeric"
          maxLength={19}
        />
        {errors.cardNumber && <Text style={styles.errorText}>{errors.cardNumber}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Expiry Date</Text>
          <TextInput
            style={[styles.input, errors.expiryDate && styles.inputError]}
            value={formData.expiryDate}
            onChangeText={(text) => updateFormData('expiryDate', formatExpiryDate(text))}
            placeholder="MM/YY"
            keyboardType="numeric"
            maxLength={5}
          />
          {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
        </View>
        
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            style={[styles.input, errors.cvv && styles.inputError]}
            value={formData.cvv}
            onChangeText={(text) => updateFormData('cvv', text.replace(/\D/g, ''))}
            placeholder="123"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Cardholder Name</Text>
        <TextInput
          style={[styles.input, errors.cardName && styles.inputError]}
          value={formData.cardName}
          onChangeText={(text) => updateFormData('cardName', text)}
          placeholder="Name on card"
          autoCapitalize="words"
        />
        {errors.cardName && <Text style={styles.errorText}>{errors.cardName}</Text>}
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderShipping();
      case 2:
        return renderPayment();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Checkout"
        showBackButton
        onBackPress={handleBack}
      />

      {/* Cart Validation Loading */}
      {isValidatingCart && (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Validating your cart...</Text>
        </View>
      )}

      {/* Cart Validation Error */}
      {cartValidationError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Cart Error</Text>
          <Text style={styles.errorMessage}>{cartValidationError}</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            size="large"
          />
        </View>
      )}

      {/* Normal Checkout Flow */}
      {!isValidatingCart && !cartValidationError && (
        <>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepIndicator}>
            <View style={[
              styles.stepCircle,
              index <= currentStep && styles.activeStepCircle
            ]}>
              {index < currentStep ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <step.icon 
                  size={16} 
                  color={index <= currentStep ? '#FFFFFF' : '#64748B'} 
                />
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              index <= currentStep && styles.activeStepLabel
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepConnector,
                index < currentStep && styles.activeStepConnector
              ]} />
            )}
          </View>
        ))}
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title={currentStep === steps.length - 1 ? 'Place Order' : 'Continue'}
            onPress={handleNext}
            loading={isProcessing}
            fullWidth
            size="large"
          />
        </View>
      </KeyboardAvoidingView>
      </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activeStepCircle: {
    backgroundColor: '#2563EB',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  activeStepLabel: {
    color: '#2563EB',
  },
  stepConnector: {
    position: 'absolute',
    top: 20,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: -1,
  },
  activeStepConnector: {
    backgroundColor: '#2563EB',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  savedAddressesContainer: {
    marginBottom: 20,
  },
  savedAddressesTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  savedAddressCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedAddressCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  savedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedAddressLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  defaultBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  savedAddressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 2,
  },
  useNewAddressButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  useNewAddressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  backToSavedButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  backToSavedText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  bottomActions: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});