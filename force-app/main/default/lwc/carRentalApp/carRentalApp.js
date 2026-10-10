import { LightningElement,track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getAvailableCars from '@salesforce/apex/CarRenatalsController.getAvailableCars';
import processBooking from '@salesforce/apex/CarRenatalsController.processBooking';
import LightningConfirm from 'lightning/confirm';
import Toast from 'lightning/toast';

export default class CarRentalApp extends NavigationMixin(LightningElement) {
    @track carFilters = {avaialble : true,isRepair : false,carBrand : '', carModel : '', carYear : '',carNumber : ''};
    @track bookingDtls = {cName:'',mobile:'',govtId:'',enDate:'',stDate:'',carId:'',carCost:'',totalDays:0,totalCost:0};
    @track cars = [];
    noCarsReturned = false;
    showModal = false;
    modalCarId;
    modalCarCost;

    carPickerDisplayInfo = {primaryField: "Model__c",additionalFields: ["Brand__c"],};

    connectedCallback(){
        this.applyFilters();
    }

    handleShowToast(title,msg,variant) {
        Toast.show({
                label: title,
                message: msg,
                variant: variant,
                mode: 'dismissible',
            });
    }

    handleFilterInp(event){
        const inpField = event.target.name;
        const inpValue = event.target.value;
        this.carFilters = {...this.carFilters,[inpField]:inpValue};
        //console.log('Fileter',JSON.stringify(this.carFilters));
    }

    applyFilters(){
        getAvailableCars({filters:this.carFilters})
        .then(result=>{
            console.log(JSON.stringify(result));
            this.noCarsReturned = result.length == 0 ? true : false;
            this.cars =  result;
        })
        .catch(error=>{
            console.log(error);
            this.handleShowToast('Error',error,'error');
        })
    }

    hideModalBox(){
        this.showModal = false;
        this.bookingDtls = {cName:'',mobile:'',govtId:'',enDate:'',stDate:'',carId:'',carCost:'',totalCost:'',totalDays:''};
    }

    handleBooking(event){
        this.modalCarId = event.target.dataset.carid;
        this.modalCarCost = event.target.dataset.cost;
        console.log(this.modalCarId);
        this.showModal = true;
    }

    handleBookingInput(event){
        const inpField = event.target.name;
        const inpValue = event.target.value;
        this.bookingDtls = {...this.bookingDtls,[inpField]:inpValue};
        //console.log(JSON.stringify(this.bookingDtls));
    }

    async handleProcessBooking(){
        const requiredInp = ['cName','mobile','govtId','stDate','enDate'];
        for (const [key, value] of Object.entries(this.bookingDtls)) {
            if(value=='' && requiredInp.includes(key)){
                this.handleShowToast('Error','Please fill all fields','error')
                return;
            }
        }
        this.bookingDtls = {...this.bookingDtls,carId:this.modalCarId,carCost:this.modalCarCost};
        const {cost,days} = this.calculateCost(this.bookingDtls.stDate,this.bookingDtls.enDate,this.bookingDtls.carCost);
        this.bookingDtls = {...this.bookingDtls,totalCost:cost,totalDays:days};

        const result = await LightningConfirm.open({
            message: `This is will cost ${cost}/- for ${days} day(s).`,
            label: 'Confirm Booking?',
            theme: 'warning',
        });
        console.log('confirm result', result);
        if(result){
            const bookingDtls1 = {};
            for (const [key, value] of Object.entries(this.bookingDtls)){
                bookingDtls1[key] = key == 'stDate' || key == 'enDate' ? new Date(value) : value;
            }
            processBooking({bookingInfo:bookingDtls1})
            .then(result=>{
                console.log(result);
                this.handleShowToast('Success','Booking successful','success');
                this.hideModalBox();
                this.applyFilters();
            })
            .catch(error=>{
                console.log(error);
                this.handleShowToast('Error',error,'error');
            })
        }
    }

    calculateCost(stDate, enDate, costPerDay) {
        const start = new Date(stDate);
        const end = new Date(enDate);
        const differenceMs = end - start;
        if (differenceMs < 0) {
            return 0;
        }
        const days = Math.ceil(
            differenceMs / (1000 * 60 * 60 * 24)
        );
        return {cost:days * Number(costPerDay),days:days};
    }

    async navToBookings() {
        const pageRef = {
            type: 'standard__component',
            attributes: {
                componentName: 'c__carRentalBookings' 
            },
            state: {
                c__myParameter: 'Hello from Source' 
            }
        };

        try {
            // Generate the relative URL for the page reference
            const url = await this[NavigationMixin.GenerateUrl](pageRef);
            
            // Open the generated URL in a new browser tab
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error opening new tab', error);
        }
    }
}